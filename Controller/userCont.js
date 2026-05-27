// Controller/userCont.js
import Users from "../models/Users.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// POST /api/users/ — register new user
export function createUser(req, res) {
  // Block creating admin accounts unless caller is already an admin
  if (req.body.role === "admin") {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can create admin accounts." });
    }
  }

  // Check if email already registered
  Users.findOne({ email: req.body.email })
    .then((existing) => {
      if (existing) {
        return res.status(400).json({ message: "Email already in use." });
      }

      const hashedPassword = bcrypt.hashSync(req.body.password, 10);

      const user = new Users({
        firstName: req.body.firstName,
        lastName:  req.body.lastName,
        email:     req.body.email,
        password:  hashedPassword,
        // role defaults to "customer", isBlock defaults to false
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
          email:     user.email,
          firstName: user.firstName,
          lastName:  user.lastName,
          role:      user.role,
          img:       user.img,
        },
        process.env.JWT_KEY
      );

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

export function isAdmin(req) {
  return req.user?.role === "admin";
}