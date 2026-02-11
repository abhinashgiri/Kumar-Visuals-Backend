import SiteSettings from "../models/SiteSettings.model.js";

const ALLOWED_DURING_MAINTENANCE = [
  "/site",
  "/auth/login",
  "/auth/logout",
  "/about"
];

const maintenanceGuard = async (req, res, next) => {
  try {
    if (req.path.startsWith("/admin")) {
      return next();
    }

    if (ALLOWED_DURING_MAINTENANCE.includes(req.path)) {
      return next();
    }

    const settings = await SiteSettings.getSingleton();

    if (settings.maintenanceMode) {
      return res.status(503).json({
        message: "Site is currently under maintenance. Please try again later.",
      });
    }

    next();
  } catch (err) {
    console.error("Error in maintenanceGuard:", err);
    next(); // fallback
  }
};

export default maintenanceGuard;
