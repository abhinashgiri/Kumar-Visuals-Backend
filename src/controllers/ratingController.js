import mongoose from "mongoose";
import Product from "../models/Product.model.js";
import User from "../models/User.model.js";
import { userHasPurchasedProduct } from "../services/order.service.js";

/* ------------------------- helper: can review ------------------------- */

export async function canUserReviewProduct({ userId, productId }) {
  // include isDeleted explicitly
  const user = await User.findById(userId).select(
    "roles purchasedProducts +isDeleted"
  );
  if (!user || user.isDeleted) return false;

  const isAdmin =
    Array.isArray(user.roles) && user.roles.includes("admin");
  if (isAdmin) return true;

  const hasOrderPurchase = await userHasPurchasedProduct({
    userId,
    productId,
  });

  if (hasOrderPurchase) return true;

  const hasInLibrary = Array.isArray(user.purchasedProducts)
    ? user.purchasedProducts.some(
        (id) => id.toString() === productId.toString()
      )
    : false;

  return hasInLibrary;
}

/* --------------------- USER: add / update rating ---------------------- */

export const rateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // hard check: user must exist and not be soft-deleted
    const userDoc = await User.findById(userId).select("name +isDeleted");
    if (!userDoc || userDoc.isDeleted) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "Rating must be 1-5" });
    }

    const canReview = await canUserReviewProduct({ userId, productId });

    if (!canReview) {
      return res.status(403).json({
        message: "You can review only those products you purchased",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const userIdStr = String(userId);

    let userNameSnapshot = req.user?.name || userDoc.name;
    if (!userNameSnapshot) {
      userNameSnapshot = "Customer";
    }

    const existing = product.ratings.find(
      (r) => String(r.userId) === userIdStr
    );

    if (existing) {
      existing.rating = numericRating;
      existing.review = review;
      if (!existing.userNameSnapshot) {
        existing.userNameSnapshot = userNameSnapshot;
      }
      if (!existing.status) {
        existing.status = "VISIBLE";
      }
    } else {
      product.ratings.push({
        userId: userIdStr,
        userNameSnapshot,
        rating: numericRating,
        review,
        status: "VISIBLE",
      });
    }

    product.updateRatingStats();
    await product.save();

    return res.json({
      message: "Rating submitted",
      averageRating: product.averageRating,
      ratingCount: product.ratingCount,
    });
  } catch (error) {
    console.error("rateProduct error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/* ------------------------- USER: delete rating ------------------------ */

export const deleteRating = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // again, block soft-deleted users
    const userDoc = await User.findById(userId).select("+isDeleted");
    if (!userDoc || userDoc.isDeleted) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const userIdStr = String(userId);
    const before = product.ratings.length;

    product.ratings = product.ratings.filter(
      (r) => String(r.userId) !== userIdStr
    );

    if (product.ratings.length === before) {
      return res.status(404).json({ message: "Rating not found" });
    }

    product.updateRatingStats();
    await product.save();

    return res.json({ message: "Rating removed" });
  } catch (error) {
    console.error("deleteRating error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/* -------------------- USER: get ratings for product ------------------- */

export const getRatings = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(
      productId,
      "ratings averageRating ratingCount"
    ).lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const ratings = Array.isArray(product.ratings)
      ? product.ratings.filter((r) => r.status !== "HIDDEN")
      : [];

    return res.json({
      ratings,
      averageRating: product.averageRating,
      ratingCount: product.ratingCount,
    });
  } catch (error) {
    console.error("getRatings error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/* ======================= ADMIN: list reviews ========================== */
/* GET /api/admin/reviews?status=&rating=&search=&page=&limit= */

export const adminListReviews = async (req, res, next) => {
  try {
    const search = (req.cleanedQuery?.search ?? req.query.search ?? "").toString().trim();
    const statusRaw = (req.cleanedQuery?.status ?? req.query.status ?? "").toString().trim();
    const ratingRaw = (req.cleanedQuery?.rating ?? req.query.rating ?? "").toString().trim();

    const page = Math.max(Number.parseInt(req.cleanedQuery?.page || req.query.page || "1", 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.cleanedQuery?.limit || req.query.limit || "20", 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const status = statusRaw.toUpperCase();
    const ratingFilter = Number(ratingRaw) || null;

    const match = {};
    if (["VISIBLE", "HIDDEN"].includes(status)) {
      match["ratings.status"] = status;
    }
    if (ratingFilter && ratingFilter >= 1 && ratingFilter <= 5) {
      match["ratings.rating"] = ratingFilter;
    }

    const searchRegex = search ? new RegExp(search, "i") : null;

    const pipelineBase = [
      { $unwind: "$ratings" },
      Object.keys(match).length ? { $match: match } : null,
      searchRegex
        ? {
            $match: {
              $or: [
                { "ratings.review": searchRegex },
                { "ratings.userNameSnapshot": searchRegex },
                { title: searchRegex },
              ],
            },
          }
        : null,
      {
        $addFields: {
          ratingUserObjectId: {
            $cond: [
              {
                $regexMatch: {
                  input: { $toString: "$ratings.userId" }, // Added $toString here
                  regex: /^[0-9a-fA-F]{24}$/,
                },
              },
              { $toObjectId: "$ratings.userId" },
              null,
            ],
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "ratingUserObjectId",
          foreignField: "_id",
          as: "ratingUser",
        },
      },
      {
        $addFields: {
          ratingUser: { $arrayElemAt: ["$ratingUser", 0] },
        },
      },
    ].filter(Boolean);

    const countPipeline = [...pipelineBase, { $count: "total" }];

    const dataPipeline = [
      ...pipelineBase,
      { $sort: { "ratings.createdAt": -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          ratingId: "$ratings._id",
          productId: "$_id",
          productTitle: "$title",
          userId: "$ratings.userId",
          userName: "$ratings.userNameSnapshot",
          userEmail: "$ratingUser.email",
          rating: "$ratings.rating",
          review: "$ratings.review",
          status: "$ratings.status",
          createdAt: "$ratings.createdAt",
        },
      },
    ];

    const [countResult, items] = await Promise.all([
      Product.aggregate(countPipeline),
      Product.aggregate(dataPipeline),
    ]);

    const total = countResult?.[0]?.total || 0;

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

/* =================== ADMIN: update review status ====================== */
/* PATCH /api/admin/reviews/:id  { status: "VISIBLE" | "HIDDEN" } */

export const adminUpdateReviewStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid review id" });
    }

    if (!["VISIBLE", "HIDDEN"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Status must be VISIBLE or HIDDEN" });
    }

    const product = await Product.findOne({ "ratings._id": id });
    if (!product) {
      return res.status(404).json({ message: "Review not found" });
    }

    const rating = product.ratings.id(id);
    if (!rating) {
      return res.status(404).json({ message: "Review not found" });
    }

    rating.status = status;

    product.updateRatingStats();
    await product.save();

    return res.json({ message: "Review updated" });
  } catch (err) {
    next(err);
  }
};

/* ======================= ADMIN: delete review ========================== */
/* DELETE /api/admin/reviews/:id */

export const adminDeleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid review id" });
    }

    const product = await Product.findOne({ "ratings._id": id });
    if (!product) {
      return res.status(404).json({ message: "Review not found" });
    }

    const rating = product.ratings.id(id);
    if (!rating) {
      return res.status(404).json({ message: "Review not found" });
    }

    rating.deleteOne();

    product.updateRatingStats();
    await product.save();

    return res.json({ message: "Review deleted" });
  } catch (err) {
    next(err);
  }
};
