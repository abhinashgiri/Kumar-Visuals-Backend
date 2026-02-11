import express from "express";
import {
  getPublicMembershipPlans,
  getPublicMembershipPlanByKey,
} from "../controllers/membershipPlanController.js";

const router = express.Router();

// GET /api/memberships/plans
router.get("/", getPublicMembershipPlans);

// GET /api/memberships/plans/:key  (e.g. BASIC, PREMIUM)
router.get("/:key", getPublicMembershipPlanByKey);

export default router;
