import express from "express";
import {
  adminGetAllMembershipPlans,
  adminGetMembershipPlanById,
  adminCreateMembershipPlan,
  adminUpdateMembershipPlan,
  adminDeleteMembershipPlan,
} from "../controllers/membershipPlanController.js";

const router = express.Router();

// GET /api/admin/memberships/plans
router.get("/", adminGetAllMembershipPlans);

// GET /api/admin/memberships/plans/:id
router.get("/:id", adminGetMembershipPlanById);

// POST /api/admin/memberships/plans
router.post("/", adminCreateMembershipPlan);

// PUT /api/admin/memberships/plans/:id
router.put("/:id", adminUpdateMembershipPlan);

// DELETE /api/admin/memberships/plans/:id
router.delete("/:id", adminDeleteMembershipPlan);

export default router;
