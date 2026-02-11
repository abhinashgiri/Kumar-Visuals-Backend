// src/routes/adminupload.routes.js
import express from "express";
import {
  uploadPreviewMedia,
  getThumbnailUploadUrl,
} from "../controllers/uploadController.js";

const router = express.Router();

/**
 * Preview Audio / Video
 * Upload → Compress (ffmpeg) → S3
 * multipart/form-data
 */
router.post("/preview-upload", uploadPreviewMedia);

/**
 * Thumbnail
 * Direct S3 upload via signed URL (NO compression needed)
 */
router.post("/thumbnail-url", getThumbnailUploadUrl);

export default router;
