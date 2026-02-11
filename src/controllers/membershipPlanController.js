import Joi from "joi";
import mongoose from "mongoose";
import MembershipPlan from "../models/MembershipPlan.model.js";

/* -------------------- VALIDATION -------------------- */

const createSchema = Joi.object({
  key: Joi.string().trim().uppercase().min(2).max(50).required(),
  name: Joi.string().trim().min(2).max(200).required(),
  price: Joi.number().min(0).required(),
  currency: Joi.string().trim().uppercase().default("INR"),

  maxDownloadsPerMonth: Joi.number().integer().min(0).allow(null),
  allowedFormats: Joi.array().items(Joi.string().trim().lowercase()).default([]),
  commercialUse: Joi.boolean().default(false),
  remixRequestsPerMonth: Joi.number().integer().min(0).default(0),

  description: Joi.string().trim().allow("").max(5000).default(""),
  features: Joi.array().items(Joi.string().trim()).max(30).default([]),

  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().min(0).default(0),
});

const updateSchema = Joi.object({
  key: Joi.string().trim().uppercase().min(2).max(50),
  name: Joi.string().trim().min(2).max(200),
  price: Joi.number().min(0),
  currency: Joi.string().trim().uppercase(),

  maxDownloadsPerMonth: Joi.number().integer().min(0).allow(null),
  allowedFormats: Joi.array().items(Joi.string().trim().lowercase()),
  commercialUse: Joi.boolean(),
  remixRequestsPerMonth: Joi.number().integer().min(0),

  description: Joi.string().trim().allow("").max(5000),
  features: Joi.array().items(Joi.string().trim()).max(30),

  isActive: Joi.boolean(),
  sortOrder: Joi.number().integer().min(0),
}).min(1);

/* -------------------- PUBLIC -------------------- */

export const getPublicMembershipPlans = async (req, res, next) => {
  try {
    const plans = await MembershipPlan.find({ isActive: true })
      .sort({ sortOrder: 1, price: 1, createdAt: 1 })
      .lean();

    return res.json({ plans });
  } catch (err) {
    next(err);
  }
};

export const getPublicMembershipPlanByKey = async (req, res, next) => {
  try {
    const key = String(req.params.key || "").trim().toUpperCase();
    if (!key) {
      return res.status(400).json({ message: "Plan key is required" });
    }

    const plan = await MembershipPlan.findOne({ key, isActive: true }).lean();
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    return res.json({ plan });
  } catch (err) {
    next(err);
  }
};

/* -------------------- ADMIN LIST -------------------- */

export const adminGetAllMembershipPlans = async (req, res, next) => {
  try {
    const search = String(
      req.cleanedQuery?.search ?? req.query.search ?? ""
    ).trim();

    const status = String(
      req.cleanedQuery?.status ?? req.query.status ?? ""
    ).trim().toUpperCase();

    const sortParam = String(
      req.cleanedQuery?.sort ?? req.query.sort ?? "sort"
    );

    const page = Math.max(
      Number.parseInt(req.cleanedQuery?.page || req.query.page || "1", 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number.parseInt(req.cleanedQuery?.limit || req.query.limit || "20", 10) ||
          20,
        1
      ),
      100
    );

    const skip = (page - 1) * limit;
    const filter = {};

    if (status === "ACTIVE") filter.isActive = true;
    else if (status === "INACTIVE") filter.isActive = false;

    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [{ key: regex }, { name: regex }, { description: regex }];
    }

    let sort;
    switch (sortParam) {
      case "price-low":
        sort = { price: 1 };
        break;
      case "price-high":
        sort = { price: -1 };
        break;
      case "newest":
        sort = { createdAt: -1 };
        break;
      case "oldest":
        sort = { createdAt: 1 };
        break;
      default:
        sort = { sortOrder: 1, price: 1 };
        break;
    }

    const [plans, total] = await Promise.all([
      MembershipPlan.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      MembershipPlan.countDocuments(filter),
    ]);

    return res.json({
      data: plans,
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

/* -------------------- ADMIN GET -------------------- */

export const adminGetMembershipPlanById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid plan id" });
    }

    const plan = await MembershipPlan.findById(id).lean();
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    return res.json({ plan });
  } catch (err) {
    next(err);
  }
};

/* -------------------- ADMIN CREATE -------------------- */

export const adminCreateMembershipPlan = async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((d) => d.message),
      });
    }

    value.key = value.key.toUpperCase().trim();

    try {
      const plan = await MembershipPlan.create(value);
      return res.status(201).json({ plan });
    } catch (err) {
      if (err.code === 11000 && err.keyPattern?.key) {
        return res.status(400).json({ message: "Plan key already exists" });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

/* -------------------- ADMIN UPDATE -------------------- */

export const adminUpdateMembershipPlan = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid plan id" });
    }

    const { error, value } = updateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((d) => d.message),
      });
    }

    if (value.key) {
      value.key = value.key.toUpperCase().trim();
    }

    try {
      const plan = await MembershipPlan.findByIdAndUpdate(id, value, {
        new: true,
        runValidators: true,
      }).lean();

      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      return res.json({ plan });
    } catch (err) {
      if (err.code === 11000 && err.keyPattern?.key) {
        return res.status(400).json({ message: "Plan key already exists" });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

/* -------------------- ADMIN DELETE -------------------- */

export const adminDeleteMembershipPlan = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid plan id" });
    }

    const plan = await MembershipPlan.findByIdAndDelete(id).lean();
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    return res.json({ message: "Plan deleted successfully" });
  } catch (err) {
    next(err);
  }
};
