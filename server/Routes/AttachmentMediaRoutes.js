// routes/AttachmentMediaRoutes.js - 5MB validation removed

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const authMiddleware = require("../middlewares/AuthUser");
const attachmentMediaController = require("../controllers/AttachmentMediaController");

// ==================== STORAGE CONFIGURATION ====================
const storage = multer.memoryStorage();

// ==================== MULTER ERROR HANDLING ====================
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size exceeded",
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
        message: "Unexpected file field. Please use 'attachment' as field name",
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

// ==================== ATTACHMENT MEDIA UPLOAD CONFIG ====================
const attachmentMediaUpload = multer({
  storage: storage,
  limits: {
    // REMOVED: fileSize: 5 * 1024 * 1024, // 5MB max file size - REMOVED
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const cleanMimeType = file.mimetype.split(";")[0];
    const mediaType =
      req.body.mediaType ||
      (file.mimetype.startsWith("video/") ? "video" : "image");

    const isImage = cleanMimeType.startsWith("image/");
    const isVideo = cleanMimeType.startsWith("video/");

    if (mediaType === "image" && !isImage) {
      return cb(new Error("Only image files are allowed"), false);
    }

    if (mediaType === "video" && !isVideo) {
      return cb(new Error("Only video files are allowed"), false);
    }

    if (!isImage && !isVideo) {
      return cb(new Error("Only image or video files are allowed"), false);
    }

    // Check file extensions
    if (mediaType === "image") {
      const allowedImageExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".bmp",
        ".tiff",
        ".svg",
      ];
      const fileExtension = path.extname(file.originalname).toLowerCase();
      if (!allowedImageExtensions.includes(fileExtension)) {
        return cb(
          new Error(
            `Unsupported image type. Allowed: ${allowedImageExtensions.join(", ")}`,
          ),
          false,
        );
      }
    }

    if (mediaType === "video") {
      const allowedVideoExtensions = [
        ".mp4",
        ".avi",
        ".mov",
        ".mkv",
        ".webm",
        ".wmv",
        ".flv",
        ".m4v",
      ];
      const fileExtension = path.extname(file.originalname).toLowerCase();
      if (!allowedVideoExtensions.includes(fileExtension)) {
        return cb(
          new Error(
            `Unsupported video type. Allowed: ${allowedVideoExtensions.join(", ")}`,
          ),
          false,
        );
      }
    }

    cb(null, true);
  },
});

// ==================== ROUTES ====================

// GET all attachment media (with filters)
router.get(
  "/attachment-media",
  authMiddleware,
  attachmentMediaController.getAttachmentMedia,
);

// GET attachment media by ID
router.get(
  "/attachment-media/:media_id",
  authMiddleware,
  attachmentMediaController.getAttachmentMediaById,
);

// GET attachment media by style number
router.get(
  "/attachment-media/style/:style_no",
  authMiddleware,
  attachmentMediaController.getAttachmentMediaByStyle,
);

// GET distinct style numbers
router.get(
  "/attachment-media/styles/distinct",
  authMiddleware,
  attachmentMediaController.getDistinctStyles,
);

// POST upload attachment media
router.post(
  "/attachment-media/upload",
  authMiddleware,
  attachmentMediaUpload.single("attachment"),
  handleMulterError,
  attachmentMediaController.uploadAttachmentMedia,
);

// DELETE attachment media (soft delete)
router.delete(
  "/attachment-media/:media_id",
  authMiddleware,
  attachmentMediaController.deleteAttachmentMedia,
);

module.exports = router;
