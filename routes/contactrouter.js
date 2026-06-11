import express from "express";
import {
  submitContactMessage,
  getContactMessages,
  getUnreadMessageCount,
  markAllContactMessagesRead,
  markContactMessageRead,
  deleteContactMessage,
} from "../Controller/contactCont.js";

const contactRouter = express.Router();

contactRouter.post("/", submitContactMessage);
contactRouter.get("/unread-count", getUnreadMessageCount);
contactRouter.patch("/mark-all-read", markAllContactMessagesRead);
contactRouter.get("/", getContactMessages);
contactRouter.patch("/:id/read", markContactMessageRead);
contactRouter.delete("/:id", deleteContactMessage);

export default contactRouter;
