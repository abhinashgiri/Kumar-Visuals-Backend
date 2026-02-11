import Joi from "joi";
import PromoCode from "../models/PromoCode.model.js";
import Product from "../models/Product.model.js";
import mongoose from "mongoose";

/* ============================================================
   VALIDATION
============================================================ */

const applySchema = Joi.object({
  code: Joi.string().trim().required(),
  productIds: Joi.array().items(Joi.string()).min(1).required(),
});

/* ============================================================
   APPLY PROMO CONTROLLER (SECURE)
============================================================ */

export const applyPromo = async (req, res, next) => {
  try {
    const { error, value } = applySchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: "Invalid request",
        details: error.details.map((d) => d.message),
      });
    }

    const { code, productIds } = value;

    /* ========================================================
       1 FETCH PROMO (CASE-INSENSITIVE)
    ======================================================== */

    const promo = await PromoCode.findOne({
      code: new RegExp(`^${code}$`, "i"),
      isActive: true,
    });

    if (!promo) {
      return res.status(404).json({
        message: "Invalid promo code",
      });
    }

    if (promo.isExpired()) {
      return res.status(400).json({
        message: "Promo code has expired",
      });
    }

    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
      return res.status(400).json({
        message: "Promo usage limit reached",
      });
    }

    /* ========================================================
       2 RECOMPUTE SUBTOTAL FROM DB (ANTI-HACK)
    ======================================================== */

    const validIds = productIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (!validIds.length) {
      return res.status(400).json({
        message: "No valid products found for promo",
      });
    }

    const products = await Product.find({
      _id: { $in: validIds },
      visibility: "public",
    }).select("price");

    if (products.length !== validIds.length) {
      return res.status(400).json({
        message: "One or more products are not purchasable",
      });
    }

    const subtotal = products.reduce((sum, p) => {
      if (typeof p.price !== "number" || p.price < 0) {
        throw new Error("Product price misconfigured");
      }
      return sum + p.price;
    }, 0);

    /* ========================================================
       3 MIN ORDER CHECK (REAL SUBTOTAL)
    ======================================================== */

    if (promo.minOrderAmount && subtotal < promo.minOrderAmount) {
      return res.status(400).json({
        message: `Minimum order amount for this code is ₹${promo.minOrderAmount}`,
      });
    }

    /* ========================================================
       4 DISCOUNT CALCULATION (HARD CLAMP)
    ======================================================== */

    let discountAmount = promo.computeDiscount(subtotal);

    // HARD SAFETY CLAMP
    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }

    if (discountAmount <= 0) {
      return res.status(400).json({
        message: "Promo code does not apply to this order",
      });
    }

    const discountedSubtotal = Math.max(0, subtotal - discountAmount);

    /* ========================================================
       5️ RESPONSE (NO SIDE EFFECTS)
    ======================================================== */

    return res.json({
      promoId: promo._id,
      code: promo.code,
      subtotal,
      discountAmount,
      discountedSubtotal,
      message: "Promo applied successfully",
    });
  } catch (err) {
    next(err);
  }
};
