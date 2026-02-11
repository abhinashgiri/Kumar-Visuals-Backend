import express from "express";
import Joi from "joi";

import {
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  registerStart,
  verifyEmail,
} from "../controllers/authController.js";
import { validateBody } from "../middlewares/validate.js";
import { protect } from "../middlewares/auth.middleware.js";
import { googleAuth } from "../controllers/googleAuthController.js";

const router = express.Router();

/* ============================ SCHEMAS ============================ */




// OTP step 1
const registerStartSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),

  roles: Joi.array()
    .items(Joi.string().valid("user"))
    .length(1)                    
    .default(["user"])
    .optional(),
});


// OTP step 2
const verifyEmailSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().trim().length(6).pattern(/^\d+$/).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

/* ============================ ROUTES ============================ */

// OTP-based signup (public)
router.post("/register/start", validateBody(registerStartSchema), registerStart);
router.post("/verify/email", validateBody(verifyEmailSchema), verifyEmail);

// Password reset (public)
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);


// Auth
router.post("/login", validateBody(loginSchema), login);
router.post("/refresh", refresh);
router.post("/google", googleAuth);
router.post("/logout", protect, logout);

export default router;
