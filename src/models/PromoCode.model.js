// models/PromoCode.model.js
import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const promoCodeSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    // percent discount: e.g. 10 => 10%
    discountPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // flat discount: e.g. 50 => ₹50
    discountFlat: {
      type: Number,
      min: 0,
      default: 0,
    },

    // max discount amount (after percent+flat)
    maxDiscount: {
      type: Number,
      min: 0,
      default: 0, // 0 => no cap
    },

    // minimum order amount required to use this promo
    minOrderAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    usageLimit: {
      type: Number,
      min: 0,
      default: 0, // 0 => unlimited
    },

    usedCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ---------- INSTANCE METHODS ----------

// promo expired
promoCodeSchema.methods.isExpired = function () {
  if (!this.isActive) return true;

  if (this.expiresAt && this.expiresAt < new Date()) return true;

  if (this.usageLimit && this.usedCount >= this.usageLimit) return true;

  return false;
};

// subtotal basis actual discount
promoCodeSchema.methods.computeDiscount = function (subtotal) {
  if (typeof subtotal !== "number" || subtotal <= 0) return 0;

  let discount = 0;

  // percentage part
  if (this.discountPercent && this.discountPercent > 0) {
    discount += (subtotal * this.discountPercent) / 100;
  }

  // flat part
  if (this.discountFlat && this.discountFlat > 0) {
    discount += this.discountFlat;
  }

  // cap by maxDiscount 
  if (this.maxDiscount && this.maxDiscount > 0 && discount > this.maxDiscount) {
    discount = this.maxDiscount;
  }

  if (discount < 0 || !Number.isFinite(discount)) return 0;


  return Math.floor(discount);
};

promoCodeSchema.index({ code: 1 }, { unique: true });

const PromoCode = models.PromoCode || model("PromoCode", promoCodeSchema);

export default PromoCode;
