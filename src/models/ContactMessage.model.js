import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const contactMessageSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 200,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    status: {
      type: String,
      enum: ["NEW", "IN_PROGRESS", "RESOLVED"],
      default: "NEW",
      index: true,
    },

    adminNotes: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
  },
  { timestamps: true }
);

contactMessageSchema.index({ createdAt: -1 });

const ContactMessage =
  models.ContactMessage || model("ContactMessage", contactMessageSchema);

export default ContactMessage;
