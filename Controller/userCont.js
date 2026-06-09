import Users from "../models/Users.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  getGoogleAuthPublicConfig,
  verifyGoogleCredential,
  mapGoogleVerifyError,
} from "../lib/googleAuth.js";
import {
  CUSTOMER_ID_MSG,
  isValidCustomerId,
  normalizeCustomerId,
} from "../lib/customerId.js";

async function resolveCustomerId(rawCustomerId, excludeUserId = null) {
  const normalized = normalizeCustomerId(rawCustomerId);
  if (!isValidCustomerId(normalized)) {
    return { error: CUSTOMER_ID_MSG };
  }
  const query = { customerId: normalized };
  if (excludeUserId) query._id = { $ne: excludeUserId };
  const duplicate = await Users.findOne(query);
  if (duplicate) {
    return { error: "Customer ID already in use." };
  }
  return { customerId: normalized };
}

function serializeUser(user) {
  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    isBlock: user.isBlock,
    customerId: user.customerId || null,
    authProvider: user.authProvider || "local",
    img: user.img,
  };
}

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
      customerId: user.customerId || null,
    },
  };
}

// POST /api/users/ — register new user
export async function createUser(req, res) {
  const { firstName, lastName, email, password, role, customerId } = req.body;

  // Only an already-authenticated admin may create another admin account
  if (role === "admin") {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can create admin accounts." });
    }
  }

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const existing = await Users.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already in use." });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const assignedRole = role === "admin" && req.user?.role === "admin" ? "admin" : "customer";

    const user = new Users({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: assignedRole,
    });

    if (assignedRole === "customer" && customerId) {
      const resolved = await resolveCustomerId(customerId);
      if (resolved.error) {
        return res.status(400).json({ message: resolved.error });
      }
      user.customerId = resolved.customerId;
    }

    await user.save();

    res.status(201).json({
      message: "Account created successfully.",
      customerId: user.customerId || null,
    });
  } catch (err) {
    res.status(500).json({ message: "Registration failed.", error: err.message });
  }
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

// GET /api/users/auth-config — public Google OAuth setup check
export function getAuthConfig(req, res) {
  res.json(getGoogleAuthPublicConfig());
}

// POST /api/users/google — sign in or register with Google ID token
export async function googleLogin(req, res) {
  const { credential, customerId } = req.body;

  if (!credential) {
    return res.status(400).json({ message: "Google credential is required." });
  }

  let payload;
  try {
    payload = await verifyGoogleCredential(credential);
  } catch (err) {
    const mapped = mapGoogleVerifyError(err);
    return res.status(mapped.status).json({
      message: mapped.message,
      error: mapped.error,
    });
  }

  try {
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
      let assignedCustomerId = null;
      if (customerId) {
        const resolved = await resolveCustomerId(customerId);
        if (resolved.error) {
          return res.status(400).json({ message: resolved.error });
        }
        assignedCustomerId = resolved.customerId;
      }

      user = await Users.create({
        email,
        firstName,
        lastName,
        googleId,
        authProvider: "google",
        img: picture,
        role: "customer",
        ...(assignedCustomerId ? { customerId: assignedCustomerId } : {}),
      });
    }

    res.json(buildAuthResponse(user, "Google sign-in successful."));
  } catch (err) {
    res.status(500).json({ message: "Google sign-in failed.", error: err.message });
  }
}

// GET /api/users/me — current user profile
export async function getCurrentUser(req, res) {
  if (!req.user?._id) {
    return res.status(403).json({ message: "Please login and try again." });
  }

  try {
    const user = await Users.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      img: user.img,
      isBlock: user.isBlock,
      customerId: user.customerId || null,
      authProvider: user.authProvider || "local",
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch profile.", error: err.message });
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

// PATCH /api/users/:id — update user details (admin only)
export async function updateUserDetails(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Admin access required." });
  }

  const { firstName, lastName, email, customerId, password } = req.body;

  try {
    const user = await Users.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (firstName !== undefined) {
      const trimmed = String(firstName).trim();
      if (!trimmed) return res.status(400).json({ message: "First name is required." });
      user.firstName = trimmed;
    }

    if (lastName !== undefined) {
      const trimmed = String(lastName).trim();
      if (!trimmed) return res.status(400).json({ message: "Last name is required." });
      user.lastName = trimmed;
    }

    if (email !== undefined) {
      const trimmed = String(email).trim().toLowerCase();
      if (!trimmed) return res.status(400).json({ message: "Email is required." });
      const duplicate = await Users.findOne({ email: trimmed, _id: { $ne: user._id } });
      if (duplicate) {
        return res.status(400).json({ message: "Email already in use." });
      }
      user.email = trimmed;
    }

    if (customerId !== undefined && user.role === "customer") {
      const resolved = await resolveCustomerId(customerId, user._id);
      if (resolved.error) {
        return res.status(400).json({ message: resolved.error });
      }
      user.customerId = resolved.customerId;
    }

    if (password !== undefined && String(password).trim()) {
      if (String(password).length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters." });
      }
      user.password = bcrypt.hashSync(String(password), 10);
    }

    await user.save();

    res.json({
      message: "User details updated.",
      user: serializeUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update user.", error: err.message });
  }
}

// PATCH /api/users/:id/role — promote or demote user (admin only)
export async function updateUserRole(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Admin access required." });
  }

  const { role } = req.body;
  if (!["admin", "customer"].includes(role)) {
    return res.status(400).json({ message: "Role must be admin or customer." });
  }

  try {
    const user = await Users.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (String(user._id) === String(req.user._id) && role !== "admin") {
      return res.status(400).json({ message: "You cannot remove your own admin access." });
    }

    user.role = role;

    if (role === "admin") {
      user.customerId = null;
    }

    await user.save();

    res.json({
      message: role === "admin" ? "User promoted to admin." : "User role set to customer.",
      user: serializeUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update role.", error: err.message });
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
      user: serializeUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update user.", error: err.message });
  }
}

// PATCH /api/users/me — update own profile (not customerId)
export async function updateMyProfile(req, res) {
  if (!req.user?._id) {
    return res.status(403).json({ message: "Please login and try again." });
  }

  if (req.body.customerId !== undefined) {
    return res.status(400).json({ message: "Customer ID cannot be updated from your profile." });
  }

  const { firstName, lastName, email } = req.body;

  try {
    const user = await Users.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (firstName !== undefined) {
      const trimmed = String(firstName).trim();
      if (!trimmed) return res.status(400).json({ message: "First name is required." });
      user.firstName = trimmed;
    }

    if (lastName !== undefined) {
      const trimmed = String(lastName).trim();
      if (!trimmed) return res.status(400).json({ message: "Last name is required." });
      user.lastName = trimmed;
    }

    if (email !== undefined) {
      const trimmed = String(email).trim().toLowerCase();
      if (!trimmed) return res.status(400).json({ message: "Email is required." });
      const duplicate = await Users.findOne({ email: trimmed, _id: { $ne: user._id } });
      if (duplicate) {
        return res.status(400).json({ message: "Email already in use." });
      }
      user.email = trimmed;
    }

    await user.save();

    const auth = buildAuthResponse(user, "Profile updated.");
    res.json({
      message: "Profile updated.",
      user: auth.user,
      token: auth.token,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update profile.", error: err.message });
  }
}

// PATCH /api/users/me/customer-id — customer sets their own ID
export async function setMyCustomerId(req, res) {
  if (!req.user?._id) {
    return res.status(403).json({ message: "Please login and try again." });
  }

  try {
    const user = await Users.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    if (user.role !== "customer") {
      return res.status(400).json({ message: "Only customer accounts use a customer ID." });
    }

    const resolved = await resolveCustomerId(req.body.customerId, user._id);
    if (resolved.error) {
      return res.status(400).json({ message: resolved.error });
    }

    user.customerId = resolved.customerId;
    await user.save();

    res.json({
      message: "Customer ID saved.",
      customerId: user.customerId,
      user: serializeUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to save customer ID.", error: err.message });
  }
}

// DELETE /api/users/:id — delete user (admin only)
export async function deleteUser(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Admin access required." });
  }

  try {
    const user = await Users.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot delete your own account." });
    }

    if (user.role === "admin") {
      return res.status(400).json({ message: "Admin accounts cannot be deleted." });
    }

    await Users.deleteOne({ _id: user._id });

    res.json({ message: "User deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete user.", error: err.message });
  }
}

// Helper used by other controllers
export function isAdmin(req) {
  return req.user?.role === "admin";
}