// routes/userrouter.js
import express from "express";
import { createUser, loginUser } from "../Controller/userCont.js";

const userRouter = express.Router();

userRouter.post("/",      createUser);  // register
userRouter.post("/login", loginUser);   // login

export default userRouter;