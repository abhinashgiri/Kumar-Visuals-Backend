// src/routes/adminStats.routes.js
import express from "express";
import { getAdminOverviewStats } from "../controllers/adminStatsController.js";

const router = express.Router();

// GET /api/admin/stats/overview
router.get("/overview", getAdminOverviewStats);

export default router;
