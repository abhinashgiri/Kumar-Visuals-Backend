import AboutPage from "../models/AboutPage.model.js";
import Joi from "joi";

/* ----------- VALIDATION SCHEMA ----------- */
const aboutSchema = Joi.object({
  hero: Joi.object({
    title: Joi.string().required(),
    subtitle: Joi.string().required(),
  }).required(),

  journey: Joi.object({
    title: Joi.string().required(),
    description: Joi.array().items(Joi.string()).min(1).required(),
  }).required(),

  stats: Joi.array().items(
    Joi.object({
      icon: Joi.string().required(),
      value: Joi.string().required(),
      label: Joi.string().required(),
      isActive: Joi.boolean().default(true),
    })
  ).default([]),

  philosophy: Joi.array().items(
    Joi.object({
      title: Joi.string().required(),
      description: Joi.string().required(),
      accentColor: Joi.string().allow("", null),
      isActive: Joi.boolean().default(true),
    })
  ).default([]),
});

/* ----------- GET /api/admin/about-page ----------- */
export const getAboutPage = async (req, res) => {
  try {
    const doc = await AboutPage.findOne().lean();
    return res.json(doc || null);
  } catch (err) {
    console.error("getAboutPage error:", err);
    res.status(500).json({ message: "Failed to load about page" });
  }
};

/* ----------- PUT /api/admin/about-page ----------- */
export const saveAboutPage = async (req, res) => {
  try {
    const { error, value } = aboutSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((d) => d.message),
      });
    }

    const doc = await AboutPage.findOneAndUpdate(
      {},
      value,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json(doc);
  } catch (err) {
    console.error("saveAboutPage error:", err);
    res.status(500).json({ message: "Failed to save about page" });
  }
};
