// routes/jigOperationMediaRoutes.js - 5MB validation removed from backend

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const authMiddleware = require("../middlewares/AuthUser");
const jigOperationMediaController = require("../controllers/jigOperationMediaController");

// ==================== STORAGE CONFIGURATION ====================
// Use memory storage for B2 uploads
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

// ==================== JIG OPERATION MEDIA UPLOAD CONFIG ====================
const jigOperationMediaUpload = multer({
  storage: storage,
  limits: {
    // REMOVED: fileSize: 5 * 1024 * 1024, // 5MB max file size - REMOVED
    files: 1, // Only 1 file per upload
  },
  fileFilter: (req, file, cb) => {
    // Clean MIME type (remove codec parameters if present)
    const cleanMimeType = file.mimetype.split(";")[0];

    // Determine media type from request or file
    const mediaType =
      req.body.mediaType ||
      (file.mimetype.startsWith("video/") ? "video" : "image");

    // Check if it's an image or video
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

    // Check file extension for images
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
        ".ico",
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

    // Check file extension for videos
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
        ".mpg",
        ".mpeg",
        ".3gp",
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

// GET all jig operation media (with filters)
router.get(
  "/jig-operation-media",
  authMiddleware,
  jigOperationMediaController.getJigOperationMedia,
);

// GET jig operation media by ID
router.get(
  "/jig-operation-media/:media_id",
  authMiddleware,
  jigOperationMediaController.getJigOperationMediaById,
);

// GET media by operation ID
router.get(
  "/jig-operation-media/folder/:folderId",
  authMiddleware,
  jigOperationMediaController.getMediaByFolder,
);

// GET media by style ID
router.get(
  "/jig-operation-media/style/:style_id",
  authMiddleware,
  jigOperationMediaController.getMediaByStyle,
);

// POST upload jig operation media (image or video)
router.post(
  "/upload-jig-operation-media",
  authMiddleware,
  jigOperationMediaUpload.single("attachment"),
  handleMulterError,
  jigOperationMediaController.uploadJigOperationMedia,
);

// DELETE jig operation media (soft delete)
router.delete(
  "/jig-operation-media/:media_id",
  authMiddleware,
  jigOperationMediaController.deleteJigOperationMedia,
);

// GET operations with media (folder structure)
router.get(
  "/jig-operation-operations",
  authMiddleware,
  jigOperationMediaController.getOperationsWithMedia,
);

// GET media by operation and style
router.get(
  "/jig-operation-media/operation/:operation_id/style/:style_id",
  authMiddleware,
  jigOperationMediaController.getMediaByOperationAndStyle,
);

// Get media by operation name (groups all operations with same name)
router.get(
  "/jig-operation-media/name/:operation_name",
  authMiddleware,
  jigOperationMediaController.getMediaByOperationName,
);

module.exports = router;
