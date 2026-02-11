// src/routes/productRoutes.js
import express from "express";
import {
  getProducts,
  getProductById,
  getDownloadUrl,  
  getRelatedProducts,
  searchProducts,
} from "../controllers/productController.js";

import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// 1. Public Search (Filters, Sorting, Pagination)
router.get("/search", searchProducts);

// 2. Public List (Latest products)
router.get("/", getProducts);

// 3. Protected Download URL (Authenticated users only)
router.get("/download", protect, getDownloadUrl);

// 4. Public Detail (ID based)
router.get("/id/:id", getProductById);

// 5. Related Products (Category/Tag based)
router.get("/id/:id/related", getRelatedProducts);

// 6. Public Detail (Slug based) - Placeholder for future implementation
router.get("/:slug", (req, res) => {
  res.status(404).json({ message: "Slug route not implemented yet" });
});

export default router;