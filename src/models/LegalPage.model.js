import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const sectionSchema = new Schema(
  {
    heading: { type: String, required: true },
    content: { type: String, required: true }, // store HTML or Markdown
  },
  { _id: true }
);

const legalPageSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      enum: ["privacy-policy", "terms-and-conditions", "refund-policy"],
    },

    title: { type: String, required: true },

    subtitle: { type: String, default: "" },

    sections: {
      type: [sectionSchema],
      default: [],
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const LegalPage =
  models.LegalPage || model("LegalPage", legalPageSchema);

export default LegalPage;
