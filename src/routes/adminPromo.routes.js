import express from "express";
import {
  adminListPromos,
  adminGetPromoById,
  adminCreatePromo,
  adminUpdatePromo,
  adminTogglePromoStatus,
  adminDeletePromo,
} from "../controllers/adminPromoController.js";

const router = express.Router();

// GET /api/admin/promos
router.get("/", adminListPromos);

// GET /api/admin/promos/:id
router.get("/:id", adminGetPromoById);

// POST /api/admin/promos
router.post("/", adminCreatePromo);

// PUT /api/admin/promos/:id
router.put("/:id", adminUpdatePromo);

// PATCH /api/admin/promos/:id/status   
router.patch("/:id/status", adminTogglePromoStatus);

// DELETE /api/admin/promos/:id
router.delete("/:id", adminDeletePromo);

export default router;
