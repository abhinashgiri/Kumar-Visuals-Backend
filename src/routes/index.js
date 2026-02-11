// src/routes/index.js
import express from "express";
const router = express.Router();

import authRoutes from "./authRoutes.js";
import productRoutes from "./productRoutes.js";
import ratingRoutes from "./ratingRoutes.js";
import userRoutes from "./user.routes.js";
import orderRoutes from "./order.route.js";
import promoRoutes from "./promoRoutes.js";
import membershipPlanRoutes from "./membershipPlan.route.js";
import contactRoutes from "./contact.routes.js";

import { protect, requireAdmin } from "../middlewares/auth.middleware.js";

import adminUserRoutes from "./adminUser.routes.js";
import adminOrderRoutes from "./adminOrder.routes.js";
import adminProductRoutes from "./adminProduct.routes.js";
import adminMembershipPlanRoutes from "./adminMembershipPlan.routes.js";
import adminContactRoutes from "./adminContact.routes.js";
import adminReviewRoutes from "./adminReview.routes.js";
import adminUploadRoutes from "./adminupload.routes.js";
import adminStatsRoutes from "./adminStats.routes.js";
import adminReportsRoutes from "./adminReports.routes.js";
import adminPromoRoutes from "./adminPromo.routes.js";
import adminSettingsRoutes from "./adminSettings.routes.js";
import adminEmailTemplateRoutes from "./adminEmailTemplate.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import legalRoutes from "./adminLegal.routes.js"
import AboutRoutes from "./adminAbout.routes.js"
import {getLegalPagePublic,} from "../controllers/legalController.js";
import { getAboutPage} from "../controllers/aboutPageController.js";
import adminRoutes from "./adminPage.routes.js"
import {getHomePageSettings} from "../controllers/adminHomeController.js"
import {getSiteSettings} from "../controllers/adminSettingsController.js";
import maintenanceGuard from "../middlewares/maintenance.middleware.js"






router.use(maintenanceGuard);

// ---------- Public / user routes ----------
router.use("/contact", contactRoutes);
router.use("/memberships/plans", membershipPlanRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/ratings", ratingRoutes);
router.use("/orders", orderRoutes);
router.use("/promos", promoRoutes);
router.use("/dashboard", dashboardRoutes);
router.get("/legal/:slug", getLegalPagePublic);
router.get("/about", getAboutPage);
router.get("/homepage",getHomePageSettings);
router.get("/site", getSiteSettings);



// ---------- Admin routes base: /api/admin/* ----------
const adminRouter = express.Router();

adminRouter.use("/users", adminUserRoutes);
adminRouter.use("/orders", adminOrderRoutes);
adminRouter.use("/products", adminProductRoutes);
adminRouter.use("/memberships/plans", adminMembershipPlanRoutes);
adminRouter.use("/contact-messages", adminContactRoutes);
adminRouter.use("/reviews", adminReviewRoutes);
adminRouter.use("/uploads", adminUploadRoutes);
adminRouter.use("/stats", adminStatsRoutes);
adminRouter.use("/reports", adminReportsRoutes);
adminRouter.use("/promos", adminPromoRoutes);
adminRouter.use("/settings", adminSettingsRoutes);
adminRouter.use("/email-templates", adminEmailTemplateRoutes);
adminRouter.use("/legal", legalRoutes);
adminRouter.use("/about", AboutRoutes);
adminRouter.use("/",adminRoutes );




router.use("/admin", protect, requireAdmin, adminRouter);

router.get("/", (req, res) => {
  res.send("Api Ok");
});

export default router;
