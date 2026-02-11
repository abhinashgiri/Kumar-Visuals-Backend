// =========================================
// adminProduct.routes.js
// =========================================

import express from "express";
import {
  adminListProducts,
  adminGetProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";

const router = express.Router();

router.get("/", adminListProducts);

router.get("/:id", adminGetProductById);

router.post("/", createProduct);

router.put("/:id", updateProduct);

router.delete("/:id", deleteProduct);

export default router;