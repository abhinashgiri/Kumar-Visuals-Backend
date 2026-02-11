// src/controllers/uploadController.js

import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "node:fs";
import mime from "mime-types";

import { uploadBufferToS3, generateKey } from "../services/s3Service.js";

ffmpeg.setFfmpegPath(ffmpegPath);

/* ============================================================
   MULTER CONFIG
============================================================ */

const upload = multer({
  dest: "tmp/",
  limits: {
    fileSize: 300 * 1024 * 1024, // 300MB hard cap
  },
});

/* ============================================================
   HELPER FUNCTIONS
============================================================ */

const validateFile = (file, mimetype) => {
  if (!file) {
    return { error: "File missing" };
  }

  const isAudio = mimetype.startsWith("audio/");
  const isVideo = mimetype.startsWith("video/");

  if (!isAudio && !isVideo) {
    return { error: "Only audio or video files are allowed" };
  }

  const ext = mime.extension(mimetype);
  const allowedExt = ["mp3", "wav", "m4a", "mp4", "mov", "webm"];

  if (!ext || !allowedExt.includes(ext)) {
    return { error: "Invalid media format" };
  }

  return { isAudio, isVideo };
};

const transcodeMedia = (inputPath, outputPath, isAudio) => {
  return new Promise((resolve, reject) => {
    let cmd = ffmpeg(inputPath);

    if (isAudio) {
      cmd
        .audioCodec("libmp3lame")
        .audioBitrate("96k")
        .audioChannels(1)
        .format("mp3")
        .setDuration(40);
    } else {
      cmd
        .videoCodec("libx264")
        .audioCodec("aac")
        .size("?x720")
        .videoBitrate("800k")
        .audioBitrate("96k")
        .format("mp4")
        .setDuration(30)
        .outputOptions([
          "-movflags +faststart",
          "-preset veryfast",
        ]);
    }

    cmd
      .on("end", resolve)
      .on("error", reject)
      .save(outputPath);
  });
};

const getDuration = (outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(outputPath, (err, data) => {
      if (err) return reject(err);
      const d = Math.floor(data?.format?.duration || 0);
      resolve(d);
    });
  });
};

const cleanupFiles = (inputPath, outputPath) => {
  try {
    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  } catch {}
};

/* ============================================================
   CONTROLLER
============================================================ */

export const uploadPreviewMedia = [
  upload.single("file"),

  async (req, res, next) => {
    let inputPath;
    let outputPath;

    try {
      const { mimetype, originalname } = req.file;
      inputPath = req.file.path;

      const validation = validateFile(req.file, mimetype);
      if (validation.error) {
        return res.status(400).json({ message: validation.error });
      }

      const { isAudio } = validation;
      const outputExt = isAudio ? "mp3" : "mp4";
      outputPath = `${inputPath}_preview.${outputExt}`;

      await transcodeMedia(inputPath, outputPath, isAudio);

      const duration = await getDuration(outputPath);

      if (!duration || duration <= 0) {
        return res.status(500).json({
          message: "Failed to detect preview duration",
        });
      }

      const buffer = fs.readFileSync(outputPath);
      const key = generateKey({
        folder: "previews",
        filename: originalname,
      });

      const contentType = isAudio ? "audio/mpeg" : "video/mp4";
      const { publicUrl } = await uploadBufferToS3({
        buffer,
        key,
        contentType,
      });

      cleanupFiles(inputPath, outputPath);

      return res.json({
        success: true,
        type: isAudio ? "audio" : "video",
        preview: {
          url: publicUrl,
          key,
          duration,
        },
      });
    } catch (err) {
      cleanupFiles(inputPath, outputPath);
      next(err);
    }
  },
];
