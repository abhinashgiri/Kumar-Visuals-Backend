import Joi from "joi";
import LegalPage from "../models/LegalPage.model.js";

/* -------------------- VALIDATION -------------------- */

const legalPageSchema = Joi.object({
  slug: Joi.string()
    .valid("privacy-policy", "terms-and-conditions", "refund-policy")
    .required(),

  title: Joi.string().min(2).max(200).required(),
  subtitle: Joi.string().allow("").max(500),

  sections: Joi.array()
    .items(
      Joi.object({
        heading: Joi.string().min(2).max(200).required(),
        content: Joi.string().min(2).max(20000).required(),
      })
    )
    .default([]),

  isActive: Joi.boolean().default(true),
});

/* -------------------- PUBLIC -------------------- */

export const getLegalPagePublic = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const page = await LegalPage.findOne({
      slug,
      isActive: true,
    }).lean();

    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    return res.json({ data: page });
  } catch (err) {
    next(err);
  }
};

/* -------------------- ADMIN LIST -------------------- */

export const adminListLegalPages = async (req, res, next) => {
  try {
    const pages = await LegalPage.find()
      .sort({ slug: 1 })
      .lean();

    return res.json({ data: pages });
  } catch (err) {
    next(err);
  }
};

/* -------------------- ADMIN GET -------------------- */

export const adminGetLegalPage = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const page = await LegalPage.findOne({ slug }).lean();
    if (!page) {
      return res.status(404).json({ message: "Legal page not found" });
    }

    return res.json({ data: page });
  } catch (err) {
    next(err);
  }
};

/* -------------------- ADMIN UPSERT -------------------- */

export const adminUpsertLegalPage = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const { error, value } = legalPageSchema.validate(
      { ...req.body, slug },
      { abortEarly: false, stripUnknown: true }
    );

    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((d) => d.message),
      });
    }

    const page = await LegalPage.findOneAndUpdate(
      { slug },
      value,
      { new: true, upsert: true, runValidators: true }
    ).lean();

    return res.json({ data: page });
  } catch (err) {
    next(err);
  }
};

/* -------------------- ADMIN DELETE -------------------- */

export const adminDeleteLegalPage = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const page = await LegalPage.findOneAndDelete({ slug });
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    return res.json({ message: "Page deleted successfully" });
  } catch (err) {
    next(err);
  }
};
