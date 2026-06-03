import Users from "../models/Users.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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

      const isPasswordCorrect = bcrypt.compareSync(password, user.password);
      if (!isPasswordCorrect) {
        return res.status(401).json({ message: "Incorrect password." });
      }

      const token = jwt.sign(
        {
          _id:       user._id,
          email:     user.email,
          firstName: user.firstName,
          lastName:  user.lastName,
          role:      user.role,
          img:       user.img,
        },
        process.env.JWT_KEY,
        { expiresIn: "7d" }
      );

      console.log("\n TOKEN:", token, "\n");

      res.json({
        message: "Login successful.",
        token,
        user: {
          _id:       user._id,
          firstName: user.firstName,
          lastName:  user.lastName,
          email:     user.email,
          role:      user.role,
          img:       user.img,
          isBlock:   user.isBlock,
        },
      });
    })
    .catch((err) => {
      res.status(500).json({ message: "Login failed.", error: err.message });
    });
}

// Helper used by other controllers
export function isAdmin(req) {
  return req.user?.role === "admin";
}