// routes/userrouter.js
import express from "express";
import {
  createUser,
  loginUser,
  googleLogin,
  getAuthConfig,
  getUsers,
  getCurrentUser,
  setMyCustomerId,
  toggleUserBlock,
  updateUserRole,
  updateUserDetails,
  deleteUser,
} from "../Controller/userCont.js";
import {
  sendPasswordOtp,
  verifyPasswordOtp,
  resetPassword,
} from "../Controller/passwordResetCont.js";

const userRouter = express.Router();

userRouter.get("/auth-config", getAuthConfig);
userRouter.get("/me", getCurrentUser);
userRouter.patch("/me/customer-id", setMyCustomerId);
userRouter.get("/", getUsers);
userRouter.patch("/:id/block", toggleUserBlock);
userRouter.patch("/:id/role", updateUserRole);
userRouter.patch("/:id", updateUserDetails);
userRouter.delete("/:id", deleteUser);
userRouter.post("/", createUser);
userRouter.post("/login", loginUser);
userRouter.post("/google", googleLogin);
userRouter.post("/forgot-password/send-otp", sendPasswordOtp);
userRouter.post("/forgot-password/verify-otp", verifyPasswordOtp);
userRouter.post("/forgot-password/reset", resetPassword);

export default userRouter;