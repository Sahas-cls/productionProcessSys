const express = require("express");
const routes = express.Router();
const multer = require("multer");
const path = require("path");
const authMiddleware = require("../middlewares/AuthUser");
const specialVideoController = require("../controllers/SpecialOperationController.js");
const { SpecialVideos } = require("../models");

// ==================== STORAGE CONFIGURATION ====================
// Use memory storage for B2 uploads
const storage = multer.memoryStorage();

// ==================== MULTER ERROR HANDLING ====================
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 500MB",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Only 1 file allowed",
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected file field. Please use 'video' as field name",
      });
    }
  } else if (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
  next();
};

// ==================== SPECIAL VIDEO UPLOAD CONFIG ====================
const specialVideoUpload = multer({
  storage: storage, // Now storage is defined
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
    files: 1, // Only 1 file per upload
  },
  fileFilter: (req, file, cb) => {
    // Clean MIME type (remove codec parameters if present)
    const cleanMimeType = file.mimetype.split(";")[0];

    // Check if it's a video file
    if (!cleanMimeType.startsWith("video/")) {
      return cb(new Error("Only video files are allowed"), false);
    }

    // Check file extension
    const allowedExtensions = [
      ".mp4",
      ".avi",
      ".mov",
      ".mkv",
      ".webm",
      ".wmv",
      ".flv",
      ".m4v",
      ".mpg",
      ".mpeg",
    ];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      return cb(
        new Error(
          `Unsupported file type. Allowed: ${allowedExtensions.join(", ")}`,
        ),
        false,
      );
    }

    cb(null, true);
  },
});

// ==================== SPECIAL VIDEO FILENAME GENERATION ====================
const generateSpecialVideoFilenames = (req, res, next) => {
  if (req.file) {
    const videoName = req.body.videoName;

    // Sanitize the video name for filename (remove special characters)
    const sanitizedName = videoName
      .trim()
      .replace(
        /[^a-zA-Z0-9\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g,
        "_",
      )
      .replace(/_+/g, "_")
      .substring(0, 100); // Limit length

    const timestamp = Date.now();
    const ext = path.extname(req.file.originalname);

    // Generate unique filename: sanitized_videoname_timestamp.ext
    const uniqueName = `${sanitizedName}_${timestamp}${ext}`;

    req.file.generatedName = uniqueName;
    req.file.originalName = req.file.originalname;
    req.file.mediaType = "video";
    req.file.b2Folder = "SpecialOperations/"; // Folder in B2
  }
  next();
};

// ==================== SPECIAL VIDEO ROUTES ====================
// !=============================== SPECIAL VIDEOS ===============================

// GET all special videos
routes.get(
  "/get-special-videos",
  authMiddleware,
  specialVideoController.getSpecialVideos,
);

// POST upload special video
routes.post(
  "/upload-special-video",
  authMiddleware,
  specialVideoUpload.single("video"),
  handleMulterError,
  generateSpecialVideoFilenames,
  specialVideoController.uploadSpecialVideo,
);

// DELETE special video (soft delete)
routes.delete(
  "/delete-video/:video_id",
  authMiddleware,
  specialVideoController.deleteSpecialVideo,
);

// OPTIONAL: Permanent delete (hard delete) - uncomment if needed
// routes.delete(
//   "/special-video-permanent/:video_id",
//   authMiddleware,
//   specialVideoController.permanentDeleteSpecialVideo,
// );

module.exports = routes;
