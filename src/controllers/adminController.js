import User from "../models/User.model.js";
import Joi from "joi";

/* --------------------------- Validation Schemas --------------------------- */

const adminProfileUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  email: Joi.string().trim().lowercase().email().optional(),
  phone: Joi.string().max(10).allow("", null).optional(),
  avatarUrl: Joi.string().uri().allow("", null).optional(),
}).or("name", "email", "phone", "avatarUrl");

const adminChangePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required().invalid(Joi.ref("currentPassword")),
});

/* ----------------------------- GET /admin/me ------------------------------ */

export const adminGetMe = async (req, res, next) => {
  try {
    if (!req.user || !Array.isArray(req.user.roles) || !req.user.roles.includes("admin")) {
      return res.status(403).json({ message: "Forbidden: admin only" });
    }

    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles || [],
        createdAt: user.createdAt,
        membership: user.membership || null,
        membershipUsage: user.membershipUsage || null,
        purchasedProducts: user.purchasedProducts || [],
        phone: user.phone ?? null,
        avatarUrl: user.avatarUrl ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
};

/* -------------------------- PUT /admin/me --------------------------------- */

export const adminUpdateMe = async (req, res, next) => {
  try {
    if (!req.user || !Array.isArray(req.user.roles) || !req.user.roles.includes("admin")) {
      return res.status(403).json({ message: "Forbidden: admin only" });
    }

    const { error, value } = adminProfileUpdateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((d) => d.message),
      });
    }

    const updates = {};

    if (typeof value.name === "string") updates.name = value.name.trim();
    if ("phone" in value) updates.phone = value.phone ? value.phone.trim() : null;
    if ("avatarUrl" in value) updates.avatarUrl = value.avatarUrl || null;

    if (value.email) {
      const existing = await User.findOne({
        email: value.email,
        _id: { $ne: req.user.id },
      }).select("_id");

      if (existing) {
        return res.status(400).json({ message: "Email already in use" });
      }

      updates.email = value.email;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided" });
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    }).lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles || [],
        createdAt: user.createdAt,
        membership: user.membership || null,
        membershipUsage: user.membershipUsage || null,
        purchasedProducts: user.purchasedProducts || [],
        phone: user.phone ?? null,
        avatarUrl: user.avatarUrl ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------- PUT /admin/me/password ----------------------------- */

export const adminChangeMyPassword = async (req, res, next) => {
  try {
    if (!req.user || !Array.isArray(req.user.roles) || !req.user.roles.includes("admin")) {
      return res.status(403).json({ message: "Forbidden: admin only" });
    }

    const { error, value } = adminChangePasswordSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((d) => d.message),
      });
    }

    const { currentPassword, newPassword } = value;

    const user = await User.findById(req.user.id).select("+password +refreshTokenHash");
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;      // pre-save hook will hash
    user.refreshTokenHash = null;     // invalidate all refresh tokens
    await user.save();

    // clear own refresh cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
};
