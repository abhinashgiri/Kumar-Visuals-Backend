import Joi from "joi";
import mongoose from "mongoose";
import PromoCode from "../models/PromoCode.model.js";

/* ==========================================================================
   VALIDATION SCHEMAS
   ========================================================================== */

export const promoCreateSchema = Joi.object({
  code: Joi.string()
    .trim()
    .uppercase()
    .min(3)
    .max(32)
    .regex(/^[A-Z0-9_]+$/)
    .message("Promo code must contain only uppercase letters, numbers, and underscores")
    .required(),

  description: Joi.string().trim().max(500).allow("", null).optional(),

  discountPercent: Joi.number().min(0).max(100).default(0),

  discountFlat: Joi.number().min(0).default(0),

  maxDiscount: Joi.number().min(0).default(0),

  minOrderAmount: Joi.number().min(0).default(0),

  usageLimit: Joi.number().integer().min(0).default(0),

  expiresAt: Joi.date()
    .greater("now")
    .allow(null)
    .message("Expiration date must be in the future"),

  isActive: Joi.boolean().default(true),
})
.custom((value, helpers) => {
  if ((!value.discountPercent || value.discountPercent === 0) && 
      (!value.discountFlat || value.discountFlat === 0)) {
    return helpers.error("any.invalid", { 
      message: "At least one discount (Percent or Flat) must be greater than 0" 
    });
  }
  return value;
}).custom((value, helpers) => {
  if (
    value.discountFlat > 0 &&
    (!value.maxDiscount || value.maxDiscount === 0)
  ) {
    return helpers.error("any.invalid", {
      message: "Flat discount promos must have a max discount cap",
    });
  }

  return value;
})

.messages({
  "any.invalid": "{{#message}}"
});

export const promoUpdateSchema = Joi.object({
  code: Joi.string()
    .trim()
    .uppercase()
    .min(3)
    .max(32)
    .regex(/^[A-Z0-9_]+$/)
    .optional(),

  description: Joi.string().trim().max(500).allow("", null).optional(),
  discountPercent: Joi.number().min(0).max(100).optional(),
  discountFlat: Joi.number().min(0).optional(),
  maxDiscount: Joi.number().min(0).optional(),
  minOrderAmount: Joi.number().min(0).optional(),
  usageLimit: Joi.number().integer().min(0).optional(),
  expiresAt: Joi.date().greater("now").allow(null).optional(),
  isActive: Joi.boolean().optional(),
})
.custom((value, helpers) => {
  if (
    value.discountFlat > 0 &&
    (!value.maxDiscount || value.maxDiscount === 0)
  ) {
    return helpers.error("any.invalid", {
      message: "Flat discount promos must have a max discount cap",
    });
  }
  return value;
})
.min(1);


/* ============= GET /api/admin/promos?search=&isActive=&page=&limit= ============= */
export const adminListPromos = async (req, res, next) => {
  try {
    const search = (req.cleanedQuery?.search ?? req.query.search ?? "").toString().trim();
    const isActiveRaw = (req.cleanedQuery?.isActive ?? req.query.isActive ?? "").toString().trim();

    const page = Math.max(Number.parseInt(req.cleanedQuery?.page || req.query.page || "1", 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.cleanedQuery?.limit || req.query.limit || "20", 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = {};

    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [{ code: regex }, { description: regex }];
    }

    if (isActiveRaw === "true") filter.isActive = true;
    if (isActiveRaw === "false") filter.isActive = false;

    const [items, total] = await Promise.all([
      PromoCode.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      PromoCode.countDocuments(filter),
    ]);

    return res.json({
      data: items,
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

/* =========================== GET /api/admin/promos/:id ========================== */
export const adminGetPromoById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const promo = await PromoCode.findById(id).lean();
    if (!promo) {
      return res.status(404).json({ message: "Promo not found" });
    }

    return res.json({ promo });
  } catch (err) {
    next(err);
  }
};

/* =========================== POST /api/admin/promos ============================ */
export const adminCreatePromo = async (req, res, next) => {
  try {
    // 1. Validate Body
    const { error, value } = promoCreateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((d) => d.message),
      });
    }

    const code = value.code.toUpperCase();

    // 2. Check for Duplicate Code
    const exists = await PromoCode.findOne({ code });
    if (exists) {
      return res.status(400).json({ message: "Promo code already exists" });
    }

    // 3. Create Promo
    const promo = await PromoCode.create({
      ...value,
      code,
    });

    return res.status(201).json({
      message: "Promo created successfully",
      promo,
    });
  } catch (err) {
    next(err);
  }
};

/* ========================= PUT /api/admin/promos/:id ========================== */
export const adminUpdatePromo = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    // 1. Validate Body
    const { error, value } = promoUpdateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((d) => d.message),
      });
    }

    // 2. Normalize Code (if updating)
    if (value.code) {
      value.code = value.code.toUpperCase();
      
      // Check if new code exists for a DIFFERENT promo
      const exists = await PromoCode.findOne({ code: value.code, _id: { $ne: id } });
      if (exists) {
        return res.status(400).json({ message: "Promo code already exists" });
      }
    }

    // 3. Update Promo
    const promo = await PromoCode.findByIdAndUpdate(id, value, {
      new: true,
      runValidators: true,
    }).lean();

    if (!promo) {
      return res.status(404).json({ message: "Promo not found" });
    }

    return res.json({
      message: "Promo updated successfully",
      promo,
    });
  } catch (err) {
    next(err);
  }
};

/* ===================== PATCH /api/admin/promos/:id/status ====================== */
export const adminTogglePromoStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be boolean (true/false)" });
    }

    const promo = await PromoCode.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).lean();

    if (!promo) {
      return res.status(404).json({ message: "Promo not found" });
    }

    return res.json({
      message: `Promo ${isActive ? "activated" : "deactivated"}`,
      promo,
    });
  } catch (err) {
    next(err);
  }
};

/* =========================== DELETE /api/admin/promos/:id ====================== */
export const adminDeletePromo = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const promo = await PromoCode.findByIdAndDelete(id).lean();
    if (!promo) {
      return res.status(404).json({ message: "Promo not found" });
    }

    return res.json({ message: "Promo deleted successfully" });
  } catch (err) {
    next(err);
  }
};