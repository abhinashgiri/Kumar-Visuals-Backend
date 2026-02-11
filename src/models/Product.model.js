import mongoose from "mongoose";
import crypto from "node:crypto";

const { Schema, models, model } = mongoose;

/* ============================================================
   SUB-SCHEMAS (Tracklist & Ratings)
============================================================ */

const trackSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    duration: { type: String }, // e.g., "03:45"
  },
  { _id: false }
);

const ratingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userNameSnapshot: { type: String, trim: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    review: { type: String, trim: true, maxLength: 2000 },
    status: {
      type: String,
      enum: ["VISIBLE", "HIDDEN"],
      default: "VISIBLE",
      index: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

/* ============================================================
   MAIN PRODUCT SCHEMA
============================================================ */

const productSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    description: { type: String, maxLength: 5000, trim: true },

    features: {
      type: [String],
      default: [],
      validate: (v) => Array.isArray(v) && v.length <= 20,
    },

    tracklist: { type: [trackSchema], default: [] },

    sampleEnabled: { type: Boolean, default: false },
    sampleYoutubeUrl: { type: String, trim: true },

    /* --- S3 ASSETS --- */
    thumbnail: {
      key: { type: String, required: true },
      url: { type: String, required: true },
      contentType: { type: String, required: true },
    },

    previewAudio: {
      key: { type: String },
      url: { type: String },
      duration: { type: Number, default: 0 },
    },

    audioFormatText: {
      type: String,
      trim: true,
      maxLength: 100,
      required: true,
    },

    isExclusive: { 
      type: Boolean, 
      default: false, 
      index: true 
    },

    /* --- DELIVERY (DRIVE ARCHITECTURE) - SECURED --- */
    download: {
      type: {
        type: String,
        enum: ["drive", "external"],
        default: "drive",
        required: true,
      },
      url: { 
        type: String, 
        required: true, 
        select: false 
      }, 
      note: { type: String, default: "" },
    },

    /* --- CLASSIFICATION --- */
    category: { type: String, index: true },
    tags: [{ type: String, trim: true }],
    genre: { type: String, trim: true },
    mood: [{ type: String, trim: true }],
    collectionType: { type: String, default: "none" },

    /* --- PRICING & VALIDATION --- */
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    
    mrp: { 
      type: Number, 
      min: 0, 
      default: 0,
      validate: [
        // Validator 1: MRP cannot be less than Price
        {
          validator: function(v) {
            // Skip validation if MRP is 0 or undefined
            if (!v) return true;

            let priceToCheck = this.price;

            // Handle Update Context (this is Query)
            if (this.getUpdate) {
               const update = this.getUpdate();
               // Check if price is being updated in this operation
               const priceInUpdate = update.price || (update.$set && update.$set.price);
               
               if (priceInUpdate === undefined) {
                 // If price is NOT in update payload, we can't validate against it easily
                 // in a query hook without an extra DB call. 
                 // So we assume valid to prevent blocking updates of other fields.
                 return true; 
               } else {
                 priceToCheck = priceInUpdate;
               }
            }

            if (priceToCheck !== undefined) {
              return v >= priceToCheck;
            }
            return true;
          },
          message: "MRP ({VALUE}) cannot be less than the selling Price."
        },
        // Validator 2: Realistic Discount Check (Max 90%)
        {
          validator: function(v) {
            let priceToCheck = this.price;

            if (this.getUpdate) {
               const update = this.getUpdate();
               const p = update.price || (update.$set && update.$set.price);
               if (p === undefined) {return true;}
               else {priceToCheck = p;} // Skip if price not available in update
            }

            if (!v || v <= priceToCheck) return true;
            const discount = ((v - priceToCheck) / v) * 100;
            return discount <= 90; 
          },
          message: "Discount looks unrealistic (cannot exceed 90%). Please check MRP and Price."
        }
      ]
    },

    /* --- VISIBILITY & STATS --- */
    visibility: {
      type: String,
      enum: ["public", "private", "draft"],
      default: "draft",
      index: true,
    },

    downloadCount: { type: Number, default: 0 },
    playCount: { type: Number, default: 0 },
    favoriteCount: { type: Number, default: 0 },

    ratings: [ratingSchema],
    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    newTagDays: { type: Number, default: 7 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ============================================================
   INDEXES & HOOKS
============================================================ */

productSchema.index({ visibility: 1, createdAt: -1 });
productSchema.index({ category: 1, createdAt: -1 });

// Auto-Slug Generation logic
productSchema.pre("validate", function (next) {
  if (this.title && !this.slug) {
    const cleaned = this.title
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/(^-+)|(-+$)/g, "")
      .substring(0, 60);

    const rand = crypto.randomBytes(3).toString("hex");
    this.slug = `${cleaned}-${rand}`;
  }
  next();
});

/* ============================================================
   VIRTUALS
============================================================ */

// Calculate discount percentage
productSchema.virtual("discountPercent").get(function () {
  if (!this.mrp || this.mrp <= this.price) return 0;
  
  const percent = ((this.mrp - this.price) / this.mrp) * 100;
  // Safety cap for display if needed, though validation handles saving
  return Math.round(percent);
});

// Check if "NEW" tag should be shown
productSchema.virtual("isNewTag").get(function () {
  if (!this.createdAt) return false;
  const days = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return days <= (this.newTagDays || 7);
});

/* ============================================================
   INSTANCE METHODS
============================================================ */

productSchema.methods.updateRatingStats = function () {
  const visible = this.ratings.filter((r) => r.status !== "HIDDEN");
  const total = visible.reduce((sum, r) => sum + r.rating, 0);
  this.ratingCount = visible.length;
  this.averageRating = this.ratingCount ? total / this.ratingCount : 0;
};

const Product = models.Product || model("Product", productSchema);
export default Product;