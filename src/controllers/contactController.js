import Joi from "joi";
import mongoose from "mongoose";
import ContactMessage from "../models/ContactMessage.model.js";
import { sendEmail } from "../utils/mailer.js";

/* -------------------- VALIDATION -------------------- */

const contactSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().max(200).required(),
  subject: Joi.string().trim().min(2).max(200).required(),
  message: Joi.string().trim().min(5).max(5000).required(),
});

const adminUpdateSchema = Joi.object({
  status: Joi.string().valid("NEW", "IN_PROGRESS", "RESOLVED").optional(),
  adminNotes: Joi.string().allow("").max(5000).optional(),
}).min(1);

/* -------------------- INTERNAL -------------------- */

function sendEmailSafely(payload) {
  setImmediate(async () => {
    try {
      await sendEmail(payload);
    } catch (err) {
      console.error("[CONTACT_EMAIL] send failed:", err?.message || err);
    }
  });
}

/* -------------------- PUBLIC -------------------- */

export const sendContactMessage = async (req, res, next) => {
  try {
    const { error, value } = contactSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((d) => d.message),
      });
    }

    const { name, email, subject, message } = value;
    const normalizedEmail = email.toLowerCase();
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER;

    const doc = await ContactMessage.create({
      name,
      email: normalizedEmail,
      subject,
      message,
      status: "NEW",
    });

    const html = `
      <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:16px;">
        <h2>New contact message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${normalizedEmail}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space:pre-wrap;background:#f3f4f6;padding:8px 10px;border-radius:8px;">${message}</p>
        <p style="margin-top:16px;font-size:12px;color:#6b7280;">
          Message ID: ${doc._id.toString()}
        </p>
      </div>
    `;

    sendEmailSafely({
      to: supportEmail,
      subject: `Contact: ${subject}`,
      html,
      replyTo: normalizedEmail,
    });

    return res.json({
      message: "Message sent successfully",
      id: doc._id,
    });
  } catch (err) {
    next(err);
  }
};

/* -------------------- ADMIN LIST -------------------- */

export const adminListContactMessages = async (req, res, next) => {
  try {
    const search = String(
      req.cleanedQuery?.search ?? req.query.search ?? ""
    ).trim();

    const status = String(
      req.cleanedQuery?.status ?? req.query.status ?? ""
    ).trim().toUpperCase();

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

    if (["NEW", "IN_PROGRESS", "RESOLVED"].includes(status)) {
      filter.status = status;
    }

    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [
        { name: regex },
        { email: regex },
        { subject: regex },
        { message: regex },
      ];
    }

    const [items, total] = await Promise.all([
      ContactMessage.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ContactMessage.countDocuments(filter),
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

/* -------------------- ADMIN GET -------------------- */

export const adminGetContactMessageById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const msg = await ContactMessage.findById(id).lean();
    if (!msg) {
      return res.status(404).json({ message: "Message not found" });
    }

    return res.json({ message: msg });
  } catch (err) {
    next(err);
  }
};

/* -------------------- ADMIN UPDATE -------------------- */

export const adminUpdateContactMessage = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const { error, value } = adminUpdateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        details: error.details.map((d) => d.message),
      });
    }

    const msg = await ContactMessage.findByIdAndUpdate(id, value, {
      new: true,
      runValidators: true,
    }).lean();

    if (!msg) {
      return res.status(404).json({ message: "Message not found" });
    }

    return res.json({ message: msg });
  } catch (err) {
    next(err);
  }
};

/* -------------------- ADMIN DELETE -------------------- */

export const adminDeleteContactMessage = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const msg = await ContactMessage.findByIdAndDelete(id).lean();
    if (!msg) {
      return res.status(404).json({ message: "Message not found" });
    }

    return res.json({ message: "Contact message deleted" });
  } catch (err) {
    next(err);
  }
};
