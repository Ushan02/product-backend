import express from "express";
import {
  submitContactMessage,
  getContactMessages,
  markContactMessageRead,
  deleteContactMessage,
} from "../Controller/contactCont.js";

const contactRouter = express.Router();

contactRouter.post("/", submitContactMessage);
contactRouter.get("/", getContactMessages);
contactRouter.patch("/:id/read", markContactMessageRead);
contactRouter.delete("/:id", deleteContactMessage);

export default contactRouter;
