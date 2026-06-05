// routes/userrouter.js
import express from "express";
import { createUser, loginUser, googleLogin, getUsers, toggleUserBlock } from "../Controller/userCont.js";

const userRouter = express.Router();

userRouter.get("/", getUsers);
userRouter.patch("/:id/block", toggleUserBlock);
userRouter.post("/", createUser);
userRouter.post("/login", loginUser);
userRouter.post("/google", googleLogin);

export default userRouter;