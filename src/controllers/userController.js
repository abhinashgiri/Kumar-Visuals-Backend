// src/controllers/userController.js
import User from "../models/User.model.js";
import Joi from "joi";
import mongoose from "mongoose";
import crypto from "node:crypto";

/* --------------------------- Validation Schemas --------------------------- */

const profileUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  phone: Joi.string().max(20).allow("", null).optional(),
  avatarUrl: Joi.string().uri().allow("", null).optional(),
}).or("name", "phone", "avatarUrl");

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});
const adminProfileUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  phone: Joi.string().max(20).allow("", null).optional(),
  avatarUrl: Joi.string().uri().allow("", null).optional(),

});
const roleUpdateSchema = Joi.object({
  roles: Joi.array().items(Joi.string().valid("user", "admin")).min(1).required(),
});

/* ----------------------------- GET /users/me ------------------------------ */

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select("+isDeleted")
      .lean();

    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "User not found" });
    }

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

/* ---------------------------- UPDATE /users/me ---------------------------- */

export const updateMe = async (req, res, next) => {
  try {
    const { error, value } = profileUpdateSchema.validate(req.body, {
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

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided" });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.user.id, isDeleted: { $ne: true } },
      updates,
      { new: true, runValidators: true }
    ).lean();

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

/* ----------------------- PUT /users/me/password --------------------------- */

export const changeMyPassword = async (req, res, next) => {
  try {
    const { error, value } = changePasswordSchema.validate(req.body, {
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

    const user = await User.findById(req.user.id).select(
      "+password +refreshTokenHash +isDeleted +isBanned"
    );

    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Account is banned" });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password must be different from current password",
      });
    }

    user.password = newPassword;
    user.refreshTokenHash = null;
    await user.save();

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
};

/* ----------------------------- DELETE /me -------------------------------- */

export const deleteMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select(
      "+isDeleted +isBanned +refreshTokenHash"
    );

    if (!user) {
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isDeleted) {
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      return res.status(200).json({ message: "Account already deleted" });
    }

    const deletionTag = `deleted_${user._id}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    user.email = `${deletionTag}@deleted.local`;
    user.name = "Deleted User";
    user.phone = undefined;
    user.avatarUrl = undefined;
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.refreshTokenHash = null;

    await user.save();

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.json({ message: "Account deleted successfully" });
  } catch (err) {
    next(err);
  }
};


/* ------------------------- ADMIN: GET users list -------------------------- */

export const adminGetUsers = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.cleanedQuery?.page || req.query.page || 1), 1);
    const limit = Math.min(
      Math.max(Number(req.cleanedQuery?.limit || req.query.limit || 20), 1),
      100
    );
    const skip = (page - 1) * limit;

    // --- Search Logic ---
    const search = req.cleanedQuery?.search || req.query.search;
    let query = { isDeleted: { $ne: true } }; // Default: Exclude deleted users

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query = {
        ...query,
        $or: [{ name: searchRegex }, { email: searchRegex }],
      };
    }

    // --- Filtering Logic (Role, Status, Membership) ---
    const role = req.cleanedQuery?.role || req.query.role;
    if (role && role !== "all") {
      query.roles = role;
    }

    const membershipStatus = req.cleanedQuery?.membership || req.query.membership;
    if (membershipStatus && membershipStatus !== "all") {
       if (membershipStatus === "NONE") {
          query["membership.status"] = { $in: ["NONE", null] };
       } else {
          query["membership.status"] = membershipStatus;
       }
    }
    
    // Account Status Filter (Active vs Locked)
    const status = req.cleanedQuery?.status || req.query.status;
    if (status === "locked") {
       query.lockUntil = { $gt: new Date() };
    } else if (status === "active") {
       query.lockUntil = { $in: [null, { $lte: new Date() }] };
       query.isBanned = { $ne: true };
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("+isBanned") // isDeleted is already excluded by query, but fetch isBanned
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return res.json({
      data: users.map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        roles: u.roles || [],
        createdAt: u.createdAt,
        membership: u.membership || null,
        membershipUsage: u.membershipUsage || null,
        isDeleted: false, // Since we filtered them out
        isBanned: !!u.isBanned,
        lockUntil: u.lockUntil, // Useful for frontend to show lock status
        avatarUrl: u.avatarUrl
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/* -------------------------- ADMIN: GET user by id ------------------------- */

export const adminGetUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select("+isBanned +isDeleted +lockUntil")
      .populate({
        path: "purchasedProducts.product",
        select: "title price thumbnail previewAudio"
      })
      .lean();

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
        isBanned: !!user.isBanned,
        isDeleted: !!user.isDeleted,
        lockUntil: user.lockUntil,
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ------------------------ ADMIN: UPDATE roles ----------------------------- */

export const adminToggleUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(id).select("+roles +isDeleted");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isDeleted) {
      return res.status(400).json({ message: "Cannot modify roles for a deleted user" });
    }

    const currentRoles = user.roles || [];
    let newRoles = currentRoles.includes("admin") ? ["user"] : ["admin"];

    user.roles = newRoles;
    await user.save();

    return res.json({
      message: "Roles updated",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        roles: newRoles,
        createdAt: user.createdAt,
        membership: user.membership,
        membershipUsage: user.membershipUsage,
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ---------------------------- ADMIN: DELETE ------------------------------- */

export const adminDeleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(id).select("+isDeleted +isBanned +refreshTokenHash");

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isDeleted) {
      return res.status(200).json({ message: "User already deleted" });
    }

    const deletionTag = `deleted_${user._id}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    user.email = `${deletionTag}@deleted.local`;
    user.name = "Deleted User";
    user.phone = undefined;
    user.avatarUrl = undefined;
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.refreshTokenHash = null;

    await user.save();

    return res.json({ message: "User deleted successfully" });
  } catch (err) {
    next(err);
  }
};

/* ----------------------------- Library helper ----------------------------- */

export const getMyLibrary = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select("+isDeleted purchasedProducts")
      .populate({
        path: "purchasedProducts.product",
        select: "title thumbnail previewAudio category genre slug audioFormatText" 
      })
      .lean();

    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "User not found" });
    }

    const items = (user.purchasedProducts || [])
      .filter(item => item.product) 
      .map((item) => ({
        id: item.product._id,
        title: item.product.title,
        slug: item.product.slug,
        thumbnail: item.product.thumbnail?.url || "", 
        previewAudio: item.product.previewAudio?.url || "",
        format: item.product.audioFormatText || "WAV / MP3", 
        purchaseDate: item.purchasedAt,
        source: item.source || "order"
      }));

      return res.json({ libraryItems: items }); 
  } catch (err) {
    next(err);
  }
};

/* ----------------------- ADMIN: EXTEND MEMBERSHIP ------------------------- */

export const adminExtendMembership = async (req, res, next) => {
  try {
    const { id } = req.params;
    const days = Math.max(1, Number.parseInt(req.body?.days ?? req.query?.days ?? "30", 10));

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(id).select("+isDeleted");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isDeleted) {
      return res.status(400).json({ message: "Cannot extend membership for a deleted user" });
    }

    const now = new Date();
    const membership = user.membership || {};

    let base = null;
    if (membership.expiresAt) {
      const expires = new Date(membership.expiresAt);
      if (!Number.isNaN(expires.getTime()) && expires > now) {
        base = expires;
      }
    }
    if (!base) base = now;

    const newExpiry = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    user.membership = {
      ...membership,
      status: "ACTIVE",
      planKey: membership.planKey || undefined,
      startedAt: membership.startedAt || now,
      expiresAt: newExpiry,
    };

    await user.save();

    return res.json({
      message: `Membership extended by ${days} day(s)`,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------- ADMIN: LOCK CONTROL -------------------------- */

export const adminLockControl = async (req, res, next) => {
  try {
    const { id } = req.params;
    const minutes = req.body?.minutes;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(id).select("+failedLoginAttempts +lockUntil +isDeleted");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isDeleted) {
      return res.status(400).json({ message: "Cannot lock a deleted user" });
    }

    const now = new Date();
    const isLocked = user.lockUntil && user.lockUntil > now;

    if (isLocked) {
      user.lockUntil = null;
      user.failedLoginAttempts = 0;
      await user.save();

      return res.json({
        message: "User unlocked",
        locked: false,
        lockUntil: null,
        user: user.toJSON(),
      });
    }

    if (typeof minutes !== "number" || minutes <= 0) {
      return res.status(400).json({
        message: "Please provide lock duration in minutes (number > 0)",
      });
    }

    const lockUntil = new Date(Date.now() + minutes * 60 * 1000);
    user.lockUntil = lockUntil;
    user.failedLoginAttempts = 5;
    await user.save();

    return res.json({
      message: `User locked for ${minutes} minutes`,
      locked: true,
      lockUntil,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------- ADMIN: TOGGLE BAN ---------------------------- */

export const adminToggleBan = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(id).select("+isBanned +isDeleted +refreshTokenHash");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isDeleted) {
      return res.status(400).json({ message: "Cannot ban a deleted user" });
    }

    user.isBanned = !user.isBanned;
    if (user.isBanned) user.refreshTokenHash = null;

    await user.save();

    return res.json({
      message: user.isBanned ? "User banned" : "User unbanned",
      banned: user.isBanned,
      userId: user._id,
    });
  } catch (err) {
    next(err);
  }
};

/* ---------------------------- ADMIN: CREATE USER -------------------------- */

export const adminCreateUser = async (req, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().trim().min(2).max(50).required(),
      email: Joi.string().trim().lowercase().email().required(),
      password: Joi.string().min(8).max(100).required(),
      roles: Joi.array().items(Joi.string().valid("user", "admin")).default(["user"]),
    });

    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((d) => d.message),
      });
    }

    const { name, email, password, roles } = value;
    const exists = await User.findOne({ email }).select("_id");
    if (exists) return res.status(400).json({ message: "Email already registered" });

    const user = await User.create({
      name,
      email,
      password,
      roles,
      membership: { status: "NONE", planKey: null, expiresAt: null, startedAt: null },
    });

    return res.status(201).json({
      message: "User created successfully",
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
};

/* ------------------------ ADMIN: UPDATE USER PROFILE ---------------------- */

export const adminUpdateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    // 2. Validate Body
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

    // 3. Check if User Exists
    const user = await User.findById(id).select("+isDeleted");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isDeleted) {
      return res.status(400).json({ message: "Cannot edit a deleted user" });
    }

    // 4. Prepare Updates (Logic consistent with updateMe)
    if (typeof value.name === "string") user.name = value.name.trim();
    
    if ("phone" in value) {
      user.phone = value.phone ? value.phone.trim() : null;
    }
    
    if ("avatarUrl" in value) {
      user.avatarUrl = value.avatarUrl || null;
    }

    // 5. Save Changes
    await user.save();

    // 6. Return Response
    return res.json({
      message: "User profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles || [],
        createdAt: user.createdAt,
        membership: user.membership,
        membershipUsage: user.membershipUsage,
        phone: user.phone ?? null,
        avatarUrl: user.avatarUrl ?? null,
        isBanned: !!user.isBanned,
        lockUntil: user.lockUntil,
      },
    });
  } catch (err) {
    next(err);
  }
};