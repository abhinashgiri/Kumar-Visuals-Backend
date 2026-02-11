import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  createOrder,
  createMembershipOrder,
  verifyOrder,
  getMyOrders,
  cancelMembership,
  resumeMembership,
} from "../controllers/orderController.js";

const router = express.Router();

// Product order + Razorpay
router.post("/", protect, createOrder);

// Membership order + Razorpay
router.post("/membership", protect, createMembershipOrder);
router.post("/membership/cancel", protect, cancelMembership);
router.post("/membership/resume", protect, resumeMembership);

// Verify Razorpay payment (product + membership both)
router.post("/verify", protect, verifyOrder);

// User orders
router.get("/", protect, getMyOrders);

export default router;
