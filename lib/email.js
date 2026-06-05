import nodemailer from "nodemailer";

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: true },
  });
}

export async function verifySmtpConnection() {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[SMTP] Not configured — OTP emails will not be sent.");
    return false;
  }

  try {
    await transporter.verify();
    console.log("[SMTP] Connected — OTP emails ready.");
    return true;
  } catch (err) {
    console.error(
      "[SMTP] Connection failed — use a Gmail App Password (not your login password):",
      err.message
    );
    return false;
  }
}

export async function sendOtpEmail(to, otp) {
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`[OTP] Email not configured. OTP for ${to}: ${otp}`);
    return { sent: false, devOtp: otp };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  try {
    await transporter.sendMail({
      from: `MyApp <${from}>`,
      to,
      subject: "Your password reset OTP",
      text: `Your password reset code is ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#2563eb;margin-bottom:8px">Password Reset</h2>
          <p style="color:#475569">Use this one-time code to reset your password:</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0f172a;margin:24px 0">${otp}</p>
          <p style="color:#94a3b8;font-size:14px">This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>
        </div>
      `,
    });

    return { sent: true };
  } catch (err) {
    console.error(`[OTP] Failed to send email to ${to}:`, err.message);
    return { sent: false, devOtp: otp, error: err.message };
  }
}
