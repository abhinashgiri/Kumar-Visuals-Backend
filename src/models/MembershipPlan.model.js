import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

const membershipPlanSchema = new Schema(
  {
    key: { type: String, required: true, unique: true }, // "BASIC", "PREMIUM"
    name: { type: String, required: true }, // "Basic", "Premium"

    price: { type: Number, required: true }, // per month
    currency: { type: String, default: "INR" },

    maxDownloadsPerMonth: { type: Number, default: null }, // null = unlimited
    allowedFormats: [{ type: String }],
    commercialUse: { type: Boolean, default: false },
    remixRequestsPerMonth: { type: Number, default: 0 },

    description: { type: String },
    features: [{ type: String }],

    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const MembershipPlan =
  models.MembershipPlan || model("MembershipPlan", membershipPlanSchema);

export default MembershipPlan;
