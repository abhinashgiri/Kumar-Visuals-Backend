import express from "express";
import {
  getRevenueReport,
  getUsersPaymentsReport,
} from "../controllers/adminStatsController.js";

import {
  usersReport,
  membershipsReport,
  downloadsReport,
} from "../controllers/adminReports.controller.js";

const router = express.Router();

/**
 * EXISTING ROUTES
 */

// GET /api/admin/reports/revenue
router.get("/revenue", getRevenueReport);

// GET /api/admin/reports/users-payments
router.get("/users-payments", getUsersPaymentsReport);



// GET /api/admin/reports/users
router.get("/users", usersReport);

// GET /api/admin/reports/memberships
router.get("/memberships", membershipsReport);

// GET /api/admin/reports/downloads
router.get("/downloads", downloadsReport);

export default router;
