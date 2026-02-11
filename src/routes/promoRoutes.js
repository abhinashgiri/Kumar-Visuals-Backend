import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { applyPromo } from "../controllers/promoController.js";

const router = express.Router();

// apply promo (user must be logged-in)
router.post("/apply", protect, applyPromo);

export default router;
