import ContactMessage from "../models/contactMessage.js";
import { isAdmin } from "./userCont.js";

export async function submitContactMessage(req, res) {
  try {
    const { name, email, subject, message } = req.body;

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const contactMessage = await ContactMessage.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
    });

    res.status(201).json({
      message: "Your message was sent successfully. We will get back to you soon.",
      id: contactMessage._id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function getContactMessages(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Admin access required." });
  }

  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function markContactMessageRead(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Admin access required." });
  }

  try {
    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    res.json({ message: "Marked as read.", contactMessage: message });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function deleteContactMessage(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Admin access required." });
  }

  try {
    const deleted = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Message not found." });
    }
    res.json({ message: "Message deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
