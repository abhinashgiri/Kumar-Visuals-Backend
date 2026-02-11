import express from "express";
import {
  adminGetOrders,
  adminGetOrderById,
  refundOrder
} from "../controllers/orderController.js";

const router = express.Router();

// GET /api/admin/orders
router.get("/", adminGetOrders);
router.patch("/:id/mark-refunded",refundOrder);

// GET /api/admin/orders/:id
router.get("/:id", adminGetOrderById);

export default router;
