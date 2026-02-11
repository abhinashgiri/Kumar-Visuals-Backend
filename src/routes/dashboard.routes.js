import express from "express";
import User from "../models/User.model.js";
import Order from "../models/Order.model.js";
import Product from "../models/Product.model.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

/* ===================== GET /api/users/library ===================== */

router.get("/library", protect, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .select("+isDeleted")
      .lean();

    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "User not found" });
    }

    // 1️ Load PAID product orders only (exclude membership orders)
    const orders = await Order.find({
      user: userId,
      status: "PAID",
      membershipPlanKey: null,
    })
      .select("_id items completedAt createdAt")
      .lean();

    if (orders.length === 0) {
      return res.json({ libraryItems: [], userRatings: {} });
    }

    // 2️ Collect unique productIds with purchase time
    const productPurchaseMap = new Map();

    for (const order of orders) {
      const purchasedAt = order.completedAt || order.createdAt;

      for (const item of order.items || []) {
        if (!item.product) continue;

        const pid = String(item.product);

        // keep latest purchase date if duplicate
        const existing = productPurchaseMap.get(pid);
        if (!existing || existing.purchasedAt < purchasedAt) {
          productPurchaseMap.set(pid, {
            productId: pid,
            orderId: String(order._id),
            purchasedAt,
            titleSnapshot: item.titleSnapshot,
          });
        }
      }
    }

    const productIds = Array.from(productPurchaseMap.keys());

    // 3️ Load products (safe fields only)
    const products = await Product.find(
      { _id: { $in: productIds } },
      { _id: 1, title: 1, ratings: 1 }
    ).lean();

    const productMap = new Map();
    const userRatings = {};

    for (const product of products) {
      const pid = String(product._id);
      productMap.set(pid, product);

      if (Array.isArray(product.ratings)) {
        const myRatings = product.ratings.filter(
          (r) => String(r.userId) === String(userId)
        );

        if (myRatings.length > 0) {
          const latest = myRatings.reduce((a, b) =>
            new Date(b.createdAt) > new Date(a.createdAt) ? b : a
          );

          userRatings[pid] = {
            rating: latest.rating,
            review: latest.review || "",
          };
        }
      }
    }

    // 4️ Build library items
    const libraryItems = [];

    for (const entry of productPurchaseMap.values()) {
      const product = productMap.get(entry.productId);

      libraryItems.push({
        id: entry.productId,
        title:
          product?.title ||
          entry.titleSnapshot ||
          `Track #${entry.productId.slice(-6)}`,
        format: "Digital Download",
        purchaseDate: entry.purchasedAt.toISOString(),
        orderId: entry.orderId,
        source: "order",
      });
    }

    // 5️ Sort by purchase date desc
    libraryItems.sort(
      (a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate)
    );

    return res.json({
      libraryItems,
      userRatings,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
