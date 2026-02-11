import express from "express";
import {
  getSiteSettings,
  updateSiteSettings,
} from "../controllers/adminSettingsController.js";
import {getHomePageSettings,saveHomePageSettings,getFrontendImageUploadUrl} from "../controllers/adminHomeController.js"

const router = express.Router();

// api/admin/settings/*

router.get("/site", getSiteSettings);
router.put("/site", updateSiteSettings);
router.get("/homepage",getHomePageSettings);
router.put("/homepage",saveHomePageSettings);
router.post("/uploads/frontend-image",getFrontendImageUploadUrl);

export default router;
