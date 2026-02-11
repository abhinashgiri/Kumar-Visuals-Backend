import express from "express";
import {
  adminListLegalPages,
  adminGetLegalPage,
  adminUpsertLegalPage,
  adminDeleteLegalPage,
} from "../controllers/legalController.js";

const router = express.Router();

// api/admin/legal/*
router.get("/list", adminListLegalPages);
router.get("/:slug", adminGetLegalPage);
router.put("/:slug", adminUpsertLegalPage);
router.delete("/:slug", adminDeleteLegalPage);

export default router;
