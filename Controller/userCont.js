import Users from "../models/Users.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

function buildAuthResponse(user, message = "Login successful.") {
  const token = jwt.sign(
    {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      img: user.img,
    },
    process.env.JWT_KEY,
    { expiresIn: "7d" }
  );

  return {
    message,
    token,
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      img: user.img,
      isBlock: user.isBlock,
    },
  };
}

// POST /api/users/ — register new user
export function createUser(req, res) {
  const { firstName, lastName, email, password, role } = req.body;

  // Only an already-authenticated admin may create another admin account
  if (role === "admin") {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can create admin accounts." });
    }
  }

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  Users.findOne({ email })
    .then((existing) => {
      if (existing) {
        return res.status(400).json({ message: "Email already in use." });
      }

      const hashedPassword = bcrypt.hashSync(password, 10);

      const user = new Users({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: role === "admin" && req.user?.role === "admin" ? "admin" : "customer",
      });

      return user.save().then(() => {
        res.status(201).json({ message: "Account created successfully." });
      });
    })
    .catch((err) => {
      res.status(500).json({ message: "Registration failed.", error: err.message });
    });
}

// POST /api/users/login
export function loginUser(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  Users.findOne({ email })
    .then((user) => {
      if (!user) {
        return res.status(404).json({ message: "No account found with that email." });
      }

      if (user.isBlock) {
        return res.status(403).json({ message: "Your account has been blocked." });
      }

      if (!user.password) {
        return res.status(400).json({ message: "Please sign in with Google." });
      }

      const isPasswordCorrect = bcrypt.compareSync(password, user.password);
      if (!isPasswordCorrect) {
        return res.status(401).json({ message: "Incorrect password." });
      }

      res.json(buildAuthResponse(user));
    })
    .catch((err) => {
      res.status(500).json({ message: "Login failed.", error: err.message });
    });
}

// POST /api/users/google — sign in or register with Google ID token
export async function googleLogin(req, res) {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ message: "Google credential is required." });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ message: "Google login is not configured on the server." });
  }

  try {
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email?.toLowerCase();
    const firstName = payload.given_name || "Google";
    const lastName = payload.family_name || "User";
    const picture = payload.picture;

    if (!email) {
      return res.status(400).json({ message: "Google account email is not available." });
    }

    let user = await Users.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      if (user.isBlock) {
        return res.status(403).json({ message: "Your account has been blocked." });
      }

      if (!user.googleId) {
        user.googleId = googleId;
      }
      if (picture) {
        user.img = picture;
      }
      await user.save();
    } else {
      user = await Users.create({
        email,
        firstName,
        lastName,
        googleId,
        authProvider: "google",
        img: picture,
        role: "customer",
      });
    }

    res.json(buildAuthResponse(user, "Google sign-in successful."));
  } catch (err) {
    res.status(401).json({ message: "Google sign-in failed.", error: err.message });
  }
}

// GET /api/users — admin list (no passwords)
export async function getUsers(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Admin access required." });
  }
  try {
    const users = await Users.find().select("-password").sort({ _id: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users.", error: err.message });
  }
}

// PATCH /api/users/:id/block — toggle block status
export async function toggleUserBlock(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Admin access required." });
  }
  try {
    const user = await Users.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    if (user.role === "admin") {
      return res.status(400).json({ message: "Cannot block admin accounts." });
    }
    user.isBlock = !user.isBlock;
    await user.save();
    res.json({
      message: user.isBlock ? "User blocked." : "User unblocked.",
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isBlock: user.isBlock,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update user.", error: err.message });
  }
}

// Helper used by other controllers
export function isAdmin(req) {
  return req.user?.role === "admin";
}