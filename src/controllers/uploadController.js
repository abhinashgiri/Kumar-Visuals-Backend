import Joi from "joi";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import mime from "mime-types";
import fs from "node:fs";
import os from "node:os";

import {
  generateKey,
  createUploadUrl,
  uploadBufferToS3,
} from "../services/s3Service.js";

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

/* ========================== MULTER ========================== */

const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 300 * 1024 * 1024,
  },
});

/* ========================== CONSTANTS ========================== */

const ALLOWED_IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp"];
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024;

/* ========================== HELPERS ========================== */

function sanitizeFilename(name = "") {
  return name
    .trim()
    .replaceAll(/\s+/g, "_")
    .replaceAll(/[^a-zA-Z0-9._-]/g, "");
}

/* ========================== CONTROLLERS ========================== */

/**
 * GET THUMBNAIL UPLOAD URL
 */
export const getThumbnailUploadUrl = async (req, res, next) => {
  try {
    const schema = Joi.object({
      filename: Joi.string().trim().required(),
      contentType: Joi.string()
        .valid(...ALLOWED_IMAGE_MIMES)
        .required(),
      size: Joi.number().max(MAX_THUMBNAIL_SIZE).optional(),
    });

    const { error, value } = schema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { filename, contentType } = value;

    const key = generateKey({
      folder: "thumbnails",
      filename: sanitizeFilename(filename),
    });

    const { uploadUrl, publicUrl, expiresIn } = await createUploadUrl({
      key,
      contentType,
    });

    return res.json({
      success: true,
      uploadUrl,
      publicUrl,
      key,
      expiresIn,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * UPLOAD & PROCESS PREVIEW MEDIA
 */
export const uploadPreviewMedia = [
  upload.single("file"),

  async (req, res, next) => {
    let inputPath;
    let outputPath;

    try {
      if (!req.file) {
        return res.status(400).json({ message: "File missing" });
      }

      const { mimetype, originalname, path: tempPath } = req.file;
      inputPath = tempPath;

      const isAudio = mimetype.startsWith("audio/");
      const isVideo = mimetype.startsWith("video/");

      if (!isAudio && !isVideo) {
        return res.status(400).json({
          message: "Only audio or video files are allowed",
        });
      }

      const ext = mime.extension(mimetype);
      if (!ext) {
        return res.status(400).json({ message: "Unsupported media type" });
      }

      const outputExt = isAudio ? "mp3" : "mp4";
      outputPath = `${inputPath}_preview.${outputExt}`;

      await new Promise((resolve, reject) => {
        const cmd = ffmpeg(inputPath);

        if (isAudio) {
          cmd
            .audioCodec("libmp3lame")
            .audioBitrate("128k")
            .audioChannels(1)
            .format("mp3")
            .setDuration(45);
        } else {
          cmd
            .videoCodec("libx264")
            .audioCodec("aac")
            .size("?x720")
            .videoBitrate("1000k")
            .audioBitrate("128k")
            .format("mp4")
            .setDuration(30)
            .outputOptions(["-movflags +faststart", "-preset veryfast"]);
        }

        cmd.on("end", resolve).on("error", reject).save(outputPath);
      });

      const duration = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(outputPath, (err, data) => {
          if (err) return reject(err);

          const rawDuration = data?.format?.duration;
          if (!rawDuration || rawDuration <= 0) {
            return reject(new Error("Invalid media duration"));
          }

          resolve(Math.ceil(rawDuration));
        });
      });

      const buffer = fs.readFileSync(outputPath);

      const key = generateKey({
        folder: "previews",
        filename: sanitizeFilename(originalname),
      });

      const contentType = isAudio ? "audio/mpeg" : "video/mp4";

      const { publicUrl } = await uploadBufferToS3({
        buffer,
        key,
        contentType,
      });

      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

      return res.json({
        success: true,
        previewAudio: {
          url: publicUrl,
          key,
          duration,
        },
      });
    } catch (err) {
      if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      next(err);
    }
  },
];
