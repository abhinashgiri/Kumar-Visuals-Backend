import express from "express";
import {
  adminListContactMessages,
  adminGetContactMessageById,
  adminUpdateContactMessage,
  adminDeleteContactMessage,
} from "../controllers/contactController.js";

const router = express.Router();

// GET /api/admin/contact-messages
router.get("/", adminListContactMessages);

// GET /api/admin/contact-messages/:id
router.get("/:id", adminGetContactMessageById);

// PATCH /api/admin/contact-messages/:id
router.patch("/:id", adminUpdateContactMessage);

// DELETE /api/admin/contact-messages/:id
router.delete("/:id", adminDeleteContactMessage);

export default router;
