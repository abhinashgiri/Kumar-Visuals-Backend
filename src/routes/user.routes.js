// src/routes/user.routes.js
import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  getMe,
  updateMe,
  changeMyPassword,
  deleteMe,
  getMyLibrary,
} from "../controllers/userController.js";

const router = express.Router();

// Logged-in user
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);
router.put("/me/password", protect, changeMyPassword);
router.delete("/me", protect, deleteMe);
router.get("/library", protect, getMyLibrary);

export default router;
