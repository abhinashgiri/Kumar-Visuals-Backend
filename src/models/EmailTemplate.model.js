import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const emailTemplateSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    }, // e.g. "WELCOME", "MEMBERSHIP_CONFIRMATION"

    name: { type: String, required: true, trim: true },

    subjectTemplate: { type: String, required: true, trim: true },

    bodyHtml: { type: String, required: true }, // full HTML with placeholders

    description: { type: String, trim: true },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const EmailTemplate =
  models.EmailTemplate || model("EmailTemplate", emailTemplateSchema);

export default EmailTemplate;
