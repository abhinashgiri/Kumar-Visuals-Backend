import Joi from "joi";
import EmailTemplate from "../models/EmailTemplate.model.js";

const templateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  subjectTemplate: Joi.string().trim().min(2).max(200).required(),
  bodyHtml: Joi.string().min(10).required(),
  description: Joi.string().trim().allow("", null),
  isActive: Joi.boolean().optional(),
});

const updateSchema = templateSchema.fork(
  ["name", "subjectTemplate", "bodyHtml"],
  (f) => f.optional()
);

/* GET /api/admin/email-templates */
export const adminListEmailTemplates = async (req, res, next) => {
  try {
    const templates = await EmailTemplate.find().sort({ key: 1 }).lean();
    return res.json({ templates });
  } catch (err) {
    next(err);
  }
};

/* GET /api/admin/email-templates/:key */
export const adminGetEmailTemplate = async (req, res, next) => {
  try {
    const key = req.params.key.toUpperCase();
    const tmpl = await EmailTemplate.findOne({ key }).lean();

    if (!tmpl) {
      return res.status(404).json({ message: "Template not found" });
    }

    return res.json({ template: tmpl });
  } catch (err) {
    next(err);
  }
};

/* POST /api/admin/email-templates */
export const adminCreateEmailTemplate = async (req, res, next) => {
  try {
    const key = (req.body.key || "").toString().trim().toUpperCase();
    if (!key) {
      return res.status(400).json({ message: "key is required" });
    }

    const { error, value } = templateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((d) => d.message),
      });
    }

    const exists = await EmailTemplate.findOne({ key });
    if (exists) {
      return res.status(400).json({ message: "Template key already exists" });
    }

    const tmpl = await EmailTemplate.create({
      key,
      ...value,
    });

    return res.status(201).json({
      message: "Email template created",
      template: tmpl,
    });
  } catch (err) {
    next(err);
  }
};

/* PUT /api/admin/email-templates/:key */
export const adminUpdateEmailTemplate = async (req, res, next) => {
  try {
    const key = req.params.key.toUpperCase();

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

    const tmpl = await EmailTemplate.findOneAndUpdate(
      { key },
      value,
      { new: true, runValidators: true }
    ).lean();

    if (!tmpl) {
      return res.status(404).json({ message: "Template not found" });
    }

    return res.json({
      message: "Email template updated",
      template: tmpl,
    });
  } catch (err) {
    next(err);
  }
};

/* DELETE /api/admin/email-templates/:key */
export const adminDeleteEmailTemplate = async (req, res, next) => {
  try {
    const key = req.params.key.toUpperCase();

    const tmpl = await EmailTemplate.findOneAndDelete({ key }).lean();
    if (!tmpl) {
      return res.status(404).json({ message: "Template not found" });
    }

    return res.json({ message: "Email template deleted" });
  } catch (err) {
    next(err);
  }
};
