// src/routes/ratingRoutes.js
import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  rateProduct,
  deleteRating,
  getRatings,
} from "../controllers/ratingController.js";

const router = express.Router();

// public: get ratings for a product
router.get("/:productId", getRatings);

// private: add/update rating
router.post("/:productId", protect, rateProduct);

// private: delete rating
router.delete("/:productId", protect, deleteRating);

export default router;
