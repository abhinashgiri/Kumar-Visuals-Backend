import express from "express";
import {
  adminListEmailTemplates,
  adminGetEmailTemplate,
  adminCreateEmailTemplate,
  adminUpdateEmailTemplate,
  adminDeleteEmailTemplate,
} from "../controllers/adminEmailTemplateController.js";

const router = express.Router();

// api/admin/email-templates/*

router.get("/", adminListEmailTemplates);
router.get("/:key", adminGetEmailTemplate);
router.post("/", adminCreateEmailTemplate);
router.put("/:key", adminUpdateEmailTemplate);
router.delete("/:key", adminDeleteEmailTemplate);

export default router;
