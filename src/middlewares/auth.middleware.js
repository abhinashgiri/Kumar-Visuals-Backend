import jwt from "jsonwebtoken";
import User from "../models/User.model.js";

export const protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, token missing" });
    }

    const token = auth.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      return res.status(401).json({
        message:
          err.name === "TokenExpiredError"
            ? "Access token expired"
            : "Invalid access token",
      });
    }

    const userId = decoded.id || decoded.sub;
    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const user = await User.findById(userId).select(
      "roles purchasedProducts +isDeleted +isBanned +lockUntil"
    );

    if (!user || user.isDeleted) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Account is banned" });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(403).json({ message: "Account is locked" });
    }

    req.user = {
      id: user._id.toString(),
      roles: user.roles || [],
      purchasedProducts: user.purchasedProducts || [],
    };

    next();
  } catch {
    return res.status(401).json({ message: "Invalid access token" });
  }
};


export const requireAdmin = (req, res, next) => {
  const roles = req.user?.roles || [];

  if (!Array.isArray(roles) || !roles.includes("admin")) {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
};
