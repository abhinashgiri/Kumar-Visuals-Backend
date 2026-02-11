import express from "express";
import {
  adminListReviews,
  adminUpdateReviewStatus,
  adminDeleteReview,
} from "../controllers/ratingController.js";

const router = express.Router();

// GET /api/admin/reviews
router.get("/", adminListReviews);

// PATCH /api/admin/reviews/:id
router.patch("/:id", adminUpdateReviewStatus);

// DELETE /api/admin/reviews/:id
router.delete("/:id", adminDeleteReview);

export default router;
