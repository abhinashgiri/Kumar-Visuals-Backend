// =========================================
// productController.js
// =========================================

import Joi from "joi";
import mongoose from "mongoose";
import sanitizeHtml from "sanitize-html";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import Product from "../models/Product.model.js";
import User from "../models/User.model.js";
import s3Client from "../services/s3Client.js";

import {
  userHasPurchasedProduct,
  getActiveMembership,
} from "../services/order.service.js";

const BUCKET = process.env.S3_BUCKET_NAME;

/* ============================================================
   SANITIZER (HTML DESCRIPTION)
============================================================ */
function sanitizeDescription(html = "") {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "h1", "h2", "h3", "blockquote"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
  });
}

/* ============================================================
   HELPERS
============================================================ */

function collectS3KeysFromProduct(product) {
  const keys = [];
  if (Array.isArray(product.files)) {
    for (const f of product.files) {
      if (f?.key) keys.push(f.key);
    }
  }
  if (product.thumbnail?.key) keys.push(product.thumbnail.key);
  if (product.previewAudio?.key) keys.push(product.previewAudio.key);
  return keys;
}

async function deleteFilesFromS3(keys) {
  if (!Array.isArray(keys) || keys.length === 0) return 0;

  await Promise.all(
    keys.map((key) =>
      s3Client.send(
        new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
      )
    )
  );

  return keys.length;
}


// --- CRITICAL SECURITY: Ensures Main File URL never goes to Public API ---
function sanitizeProductForPublic(product) {
  if (!product) return product;

  // If it's a Mongoose document, convert to object first (triggers virtuals)
  const obj = typeof product.toObject === "function" ? product.toObject() : { ...product };

  // STRICTLY FILTER: Only allow preview files
  if (Array.isArray(obj.files)) {
    obj.files = obj.files.filter((f) => f?.isPreview === true);
  }

  // Explicitly delete download object (Double safety)
delete obj.download;
delete obj.downloadUrl;
delete obj.downloadType;

  
  return obj;
}

async function deleteProductDocument(productId) {
  if (mongoose.connection.readyState === 1) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const deleted = await Product.findByIdAndDelete(productId, { session });
      await session.commitTransaction();
      return deleted;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
  return Product.findByIdAndDelete(productId);
}

// --- Helper to safely fetch Hidden URL (Collision Free) ---
async function fetchHiddenDownloadLink(productId) {
  // Explicitly select hidden fields. Because schema has select: false, this avoids path collision.
  const doc = await Product.findById(productId).select("download.url download.type");
  return doc?.download || null;
}

/* ============================================================
   JOI SCHEMA (Validation with Custom Pricing Logic)
============================================================ */
const productValidationSchema = Joi.object({
    title: Joi.string().min(2).max(200).required(),
    slug: Joi.string().lowercase().max(80),
    description: Joi.string().allow("").max(5000),
    isExclusive: Joi.boolean().default(false),
    
    download: Joi.object({
        url: Joi.string().uri().required().messages({
            "string.empty": "Main download URL (Drive/Dropbox) is required",
            "string.uri": "Download URL must be a valid link"
        }),
        type: Joi.string().valid("drive", "external").default("drive"),
        note: Joi.string().allow("").optional()
    }).required(),

    files: Joi.array().items(
  Joi.object({
    key: Joi.string().required(),
    url: Joi.string().uri().required(),
    isPreview: Joi.boolean().default(false),
  })
).default([]),

    
previewAudio: Joi.object({
  url: Joi.string().uri().required(),
  key: Joi.string().required(),
  duration: Joi.number().min(1).required()
}).required(),


    thumbnail: Joi.object({ 
        key: Joi.string().required(), 
        url: Joi.string().uri().required(), 
        contentType: Joi.string().required() 
    }).required(),

    audioFormatText: Joi.string().trim().max(100).required(),

    features: Joi.array().items(Joi.string()).max(20).default([]),
    tracklist: Joi.array().default([]).max(1000),
    category: Joi.string().allow(""),
    tags: Joi.array().default([]),
    genre: Joi.string().allow(""),
    mood: Joi.array().default([]),
    collectionType: Joi.string().default("none"),
    mrp: Joi.number().min(0),
    price: Joi.number().min(0).required(),
    currency: Joi.string().default("INR"),
    visibility: Joi.string().valid("public", "private", "draft").default("draft"),
    newTagDays: Joi.number().min(0).default(7),
    sampleEnabled: Joi.boolean().default(false),
    sampleYoutubeUrl: Joi.when("sampleEnabled", { 
        is: true, 
        then: Joi.string().uri().required(), 
        otherwise: Joi.string().allow("").optional() 
    }),
})
.unknown(true)
.custom((value, helpers) => {

    if (value.mrp !== undefined && value.mrp > 0 && value.mrp < value.price) {
        return helpers.message("MRP cannot be less than the selling Price.");
    }

    if (value.mrp !== undefined && value.mrp > 0) {
        const discount = ((value.mrp - value.price) / value.mrp) * 100;
        if (discount > 90) {
             return helpers.message(`Unrealistic discount detected (${Math.round(discount)}%). Please check MRP and Price.`);
        }
    }
    
    return value;
});


  const createProductSchema = productValidationSchema.keys({
  previewAudio: Joi.object({
    url: Joi.string().uri().required(),
    key: Joi.string().required(),
    duration: Joi.number().min(1).required()
  }).required()
});

const updateProductSchema = productValidationSchema.keys({
  previewAudio: Joi.object({
    url: Joi.string().uri().required(),
    key: Joi.string().required(),
    duration: Joi.number().min(1)
  }).optional()
});


/* ============================================================
   CONTROLLER METHODS
============================================================ */

export const createProduct = async (req, res, next) => {
  try {
    const { error, value } = createProductSchema.validate(req.body, {
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    if (value.description) {
      value.description = sanitizeDescription(value.description);
    }

    const product = await Product.create(value);
    return res.status(201).json({ message: "Product created", product });
  } catch (err) {
    next(err);
  }
};


export const updateProduct = async (req, res, next) => {
  try {
    const { error, value } = updateProductSchema.validate(req.body, {
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const existing = await Product.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }

    // cleanup old preview if replaced
    if (
      existing.previewAudio?.key &&
      value.previewAudio?.key &&
      existing.previewAudio.key !== value.previewAudio.key
    ) {
      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: existing.previewAudio.key,
          })
        );
      } catch (e) {
        console.warn("Preview cleanup failed:", e.message);
      }
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      value,
      { new: true, runValidators: true }
    );

    return res.json({ message: "Product updated", product });
  } catch (err) {
    next(err);
  }
};



export const deleteProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const keys = collectS3KeysFromProduct(product);
    await deleteFilesFromS3(keys);
    await deleteProductDocument(productId);

    return res.json({ message: "Product deleted successfully", productId });
  } catch (error_) { next(error_); }
};

// --- PUBLIC API: Get All (Latest First) ---
export const getProducts = async (req, res, next) => {
  try {
    // Note: Schema hides download.url by default (select: false).
    const products = await Product.find({ visibility: "public" })
  .sort({ createdAt: -1 })
  .lean();

    
    const safeProducts = products.map((p) => sanitizeProductForPublic(p));
    return res.status(200).json(safeProducts);
  } catch (error_) { next(error_); }
};

// --- PUBLIC API: Get By ID ---
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const isAdmin = Boolean(req.user?.roles?.includes("admin"));
    if (product.visibility !== "public" && !isAdmin) {
      return res.status(404).json({ message: "Product not found" });
    }

    const safeProduct = sanitizeProductForPublic(product);
    return res.status(200).json(safeProduct);
  } catch (error_) { next(error_); }
};

export const getRelatedProducts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const current = await Product.findById(id);
    if (!current) return res.status(404).json({ message: "Product not found" });

    const baseFilter = { _id: { $ne: current._id }, visibility: "public" };
    const orConditions = [];
    if (current.category) orConditions.push({ category: current.category });
    if (Array.isArray(current.tags) && current.tags.length > 0) orConditions.push({ tags: { $in: current.tags } });

    let query = baseFilter;
    if (orConditions.length > 0) query = { ...baseFilter, $or: orConditions };

    let related = await Product.find(query).sort({ createdAt: -1 }).limit(6);
    if (!related.length) {
      related = await Product.find({ _id: { $ne: current._id }, visibility: "public" }).sort({ createdAt: -1 }).limit(6);
    }

    const safeRelated = related.map((p) => sanitizeProductForPublic(p));
    return res.json(safeRelated);
  } catch (error_) { next(error_); }
};

/* ============================================================
   DOWNLOAD URL (SECURE)
============================================================ */

export const getDownloadUrl = async (req, res, next) => {
  try {
    const productId = extractProductId(req, res);
    if (!productId) return;

    // 1. Fetch Product
    const product = await Product.findById(productId).select("+download.url");
    if (!product) return res.status(404).json({ message: "Product not found" });

    const downloadUrl = product.download?.url;
    if (!downloadUrl) {
       return res.status(404).json({ message: "Download link not configured" });
    }

    const user = await loadAndValidateUser(req, res);
    if (!user) return; // Response handled in helper

    const isAdmin = isUserAdmin(user);
    if (!allowAccessToNonPublicProduct(product, isAdmin, res)) return;

    // 2. Check Previous Purchase (Orders OR Previous Membership Download)
    const hasAccess = await checkAccess(user, isAdmin, productId);
    
    if (hasAccess) {
      return res.json({
        download: { url: downloadUrl, type: product.download?.type || "drive" }
      });
    }

    // 3. Process New Membership Download
    await handleMembershipDownload({ 
        user, 
        product, 
        productId, 
        res,
        downloadUrl // Pass URL explicitly
    });

  } catch (error_) {
    console.error("[Download] Error:", error_);
    next(error_);
  }
};


/* ----------------------------- Helpers ----------------------------------- */

function extractProductId(req, res) {
  const { productId } = req.query;
  if (!productId) { res.status(400).json({ message: "Missing productId" }); return null; }
  return productId;
}

async function loadAndValidateUser(req, res) {
  const authUser = req.user;
  const user = authUser
  ? await User.findById(authUser.id).select("+isDeleted purchasedProducts roles membershipUsage")
  : null;

  if (!user || user.isDeleted) { res.status(401).json({ message: "Unauthorized" }); return null; }
  return user;
}

function isUserAdmin(user) {
  return Array.isArray(user.roles) && user.roles.includes("admin");
}

function allowAccessToNonPublicProduct(product, isAdmin, res) {
  if (product.visibility === "public") return true;
  if (!isAdmin) { res.status(404).json({ message: "Product not found" }); return false; }
  return true;
}

async function checkAccess(user, isAdmin, productId) {
  if (isAdmin) return true;

  const hasViaOrders = await userHasPurchasedProduct({
    userId: user.id || user._id.toString(),
    productId,
  });

  let hasViaUserCache = false;
  if (Array.isArray(user.purchasedProducts)) {
    hasViaUserCache = user.purchasedProducts.some((item) => {
      const pId =
  item &&
  typeof item === "object" &&
  item.product &&
  mongoose.Types.ObjectId.isValid(item.product)
    ? item.product.toString()
    : null;

      return pId === productId.toString();
    });
  }

  return hasViaOrders || hasViaUserCache;
}

// Safe URL Fetcher
async function respondWithHiddenUrl(productId, res) {
    const hiddenData = await fetchHiddenDownloadLink(productId);
    
    if (!hiddenData || !hiddenData.url) {
        return res.status(404).json({ message: "Download link not configured for this product" });
    }

    return res.json({ 
        downloadUrl: hiddenData.url,
        type: hiddenData.type || "drive"
    });
}

async function handleMembershipDownload({ user, product, productId, res, downloadUrl }) {


  if (product.isExclusive) {
    console.log(`[Download] Blocked: Product ${product.title} is EXCLUSIVE.`);
    return res.status(403).json({ 
      message: "This is an Exclusive product. It is not included in membership plans.",
      code: "EXCLUSIVE_ITEM_REQUIRED_PURCHASE" 
    });
  }

  // 1. Check if Membership exists
  const { planKey, meta } = await getActiveMembership(user);

  if (!planKey || !meta) {
    console.log(`[Download] Failed: No active membership for ${user._id}`);
    return res.status(403).json({ 
      message: "Active membership required.",
      code: "NO_MEMBERSHIP" 
    });
  }

  // 2. Normalize & Reset Usage
  let usage = normalizeMembershipUsage(user);
  usage = resetUsageIfNewMonth(usage);

  // 3. Check Limits
  const limit = meta.maxDownloadsPerMonth;
  const used = usage.downloadsUsed || 0;

  console.log(`[Download] Plan: ${planKey}, Used: ${used}, Limit: ${limit}`);

  // limit === null means UNLIMITED
  if (limit !== null && used >= limit) {
    return res.status(403).json({ 
      message: `Monthly download limit reached (${limit}/${limit}).`,
      code: "LIMIT_REACHED"
    });
  }

  // 4. Update User State
  usage.downloadsUsed = used + 1; // Increment
  ensureProductInLibrary(user, product, productId); // Add to "Purchased" so next time it's free

  user.membershipUsage = usage;
  
  user.markModified("membershipUsage"); 
  user.markModified("purchasedProducts");
  
  await User.updateOne(
  { 
    _id: user._id,
    "membershipUsage.downloadsUsed": used 
  },
  {
    $set: { membershipUsage: usage },
    $addToSet: {
      purchasedProducts: {
        product: product._id,
        purchasedAt: new Date(),
        source: "membership"
      }
    }
  }
);


  console.log(`[Download] Success. New Count: ${usage.downloadsUsed}`);

  // 5. Respond
  return res.json({
    download: {
      url: downloadUrl,
      type: product.download?.type || "drive"
    }
  });
}


function ensureProductInLibrary(user, product, productId) {
 if (!Array.isArray(user.purchasedProducts)) {
  throw new TypeError("Invalid purchasedProducts state for user " + user._id);
}
  const alreadyOwned = user.purchasedProducts.some((item) => {
     const pId =
  item &&
  typeof item === "object" &&
  item.product &&
  mongoose.Types.ObjectId.isValid(item.product)
    ? item.product.toString()
    : null;

     return pId === productId.toString();
  });
  if (!alreadyOwned) {
    user.purchasedProducts.push({
      product: product._id,
      purchasedAt: new Date(),
      source: "membership"
    });
  }
}

function normalizeMembershipUsage(user) {
  if (!user.membershipUsage) {
    return {
      periodStart: new Date(),
      downloadsUsed: 0,
      remixRequestsUsed: 0,
    };
  }

  return {
    periodStart: user.membershipUsage.periodStart || new Date(),
    downloadsUsed: user.membershipUsage.downloadsUsed || 0,
    remixRequestsUsed: user.membershipUsage.remixRequestsUsed || 0,
  };
}


function resetUsageIfNewMonth(usage) {
  const now = new Date();
  const { periodStart } = usage;
  const sameMonth = periodStart.getFullYear() === now.getFullYear() && periodStart.getMonth() === now.getMonth();
  if (sameMonth) return usage;
  return { periodStart: now, downloadsUsed: 0, remixRequestsUsed: 0 };
}

/* ============================================================
   ADMIN & SEARCH (Sorting, REMOVED .lean())
============================================================ */

export const searchProducts = async (req, res, next) => {
    try {
        const q = (req.query.q || "").toString().trim();
        const sortParam = (req.query.sort || "latest").toString(); // Get sort param
        const page = Math.max(Number.parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit) || 12, 1), 50);
        const skip = (page - 1) * limit;

        const filter = { visibility: "public" };
        if(q) {
            const regex = new RegExp(q, "i");
            filter.$or = [
                { title: regex },
                { category: regex },
                { tags: { $in: [regex] } }
            ];
        }

        // Apply Sorting Logic
        let sort = {};
        switch (sortParam) {
            case "price-low":
                sort = { price: 1 };
                break;
            case "price-high":
                sort = { price: -1 };
                break;
            case "rating":
                sort = { averageRating: -1, createdAt: -1 };
                break;
            case "oldest":
                sort = { createdAt: 1 };
                break;
            case "latest":
            default:
                sort = { createdAt: -1 };
                break;
        }

        const [items, total] = await Promise.all([
            Product.find(filter)
                .sort(sort) // Apply sort
                .skip(skip)
                .limit(limit) 
                ,
            Product.countDocuments(filter)
        ]);

        const safeItems = items.map(p => sanitizeProductForPublic(p));
        
        return res.json({ 
            products: safeItems, 
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch(e) { next(e); }
};

export const adminListProducts = async (req, res, next) => {
    try {
        const items = await Product.find().limit(20);
        return res.json({ data: items });
    } catch(e) { next(e); }
};

export const adminGetProductById = async (req, res, next) => {
    try {
        // Fetch basic data
        const product = await Product.findById(req.params.id).lean();
        if (!product) return res.status(404).json({ message: "Product not found" });

        // Admin needs download details - fetch separately to avoid collision
        const hiddenData = await fetchHiddenDownloadLink(req.params.id);
        if (hiddenData) {
            product.download = hiddenData;
        }

        return res.json({ product });
    } catch(e) { next(e); }
};

export const updateThumbnail = async (req, res, next) => {
    try {
      const schema = Joi.object({
        key: Joi.string().required(),
        url: Joi.string().uri().required(),
        contentType: Joi.string().valid("image/png", "image/jpeg", "image/webp").required(),
      });
  
      const { error, value } = schema.validate(req.body);
      if (error) return res.status(400).json({ message: error.details[0].message });
  
      const { key, url, contentType } = value;
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ message: "Product not found" });
  
      if (product.thumbnail?.key) {
        try {
          await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: product.thumbnail.key }));
        } catch (error_) { console.log("⚠ Could not delete old thumbnail:", error_.message); }
      }
  
      product.thumbnail = { key, url, contentType };
      await product.save();
  
      return res.json({ message: "Thumbnail updated successfully", thumbnail: product.thumbnail });
    } catch (error_) { next(error_); }
};