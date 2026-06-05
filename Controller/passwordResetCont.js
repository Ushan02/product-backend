import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Users from "../models/Users.js";
import PasswordResetOtp from "../models/passwordResetOtp.js";
import { sendOtpEmail } from "../lib/email.js";

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const RESET_TOKEN_EXPIRY = "15m";
const MAX_OTP_ATTEMPTS = 5;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function issueResetToken(email) {
  return jwt.sign(
    { email, purpose: "password-reset" },
    process.env.JWT_KEY,
    { expiresIn: RESET_TOKEN_EXPIRY }
  );
}

function verifyResetToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_KEY);
  if (decoded.purpose !== "password-reset" || !decoded.email) {
    throw new Error("Invalid reset token.");
  }
  return decoded.email;
}

// POST /api/users/forgot-password/send-otp
export async function sendPasswordOtp(req, res) {
  const email = normalizeEmail(req.body.email);

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No account found with that email." });
    }

    if (user.isBlock) {
      return res.status(403).json({ message: "Your account has been blocked." });
    }

    const otp = generateOtp();
    const otpHash = bcrypt.hashSync(otp, 10);

    await PasswordResetOtp.deleteMany({ email });
    await PasswordResetOtp.create({
      email,
      otpHash,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    });

    const mailResult = await sendOtpEmail(email, otp);

    const isDev = process.env.NODE_ENV !== "production";

    res.json({
      message: mailResult.sent
        ? "OTP sent to your email."
        : isDev
          ? "OTP generated — email delivery failed; use the dev code below or check server logs."
          : "OTP could not be delivered. Please try again later.",
      email,
      ...(isDev && !mailResult.sent ? { devOtp: mailResult.devOtp } : {}),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to send OTP.", error: err.message });
  }
}

// POST /api/users/forgot-password/verify-otp
export async function verifyPasswordOtp(req, res) {
  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp || "").trim();

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required." });
  }

  try {
    const record = await PasswordResetOtp.findOne({ email }).sort({ _id: -1 });

    if (!record) {
      return res.status(400).json({ message: "No OTP found. Please request a new one." });
    }

    if (record.expiresAt < new Date()) {
      await PasswordResetOtp.deleteMany({ email });
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await PasswordResetOtp.deleteMany({ email });
      return res.status(429).json({ message: "Too many attempts. Please request a new OTP." });
    }

    const isValid = bcrypt.compareSync(otp, record.otpHash);
    if (!isValid) {
      record.attempts += 1;
      await record.save();
      return res.status(401).json({ message: "Incorrect OTP. Please try again." });
    }

    await PasswordResetOtp.deleteMany({ email });

    const resetToken = issueResetToken(email);

    res.json({
      message: "OTP verified. You can now set a new password.",
      resetToken,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to verify OTP.", error: err.message });
  }
}

// POST /api/users/forgot-password/reset
export async function resetPassword(req, res) {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    return res.status(400).json({ message: "Reset token and new password are required." });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  }

  try {
    const email = verifyResetToken(resetToken);
    const user = await Users.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.isBlock) {
      return res.status(403).json({ message: "Your account has been blocked." });
    }

    user.password = bcrypt.hashSync(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully. You can now sign in." });
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired reset session. Please start again." });
  }
}
