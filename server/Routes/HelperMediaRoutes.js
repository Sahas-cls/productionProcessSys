const express = require("express");
const routes = express.Router();
const multer = require("multer");
const path = require("path");
const controller = require("../controllers/HelperMediaController");
const authMiddleware = require("../middlewares/AuthUser");

// Use memory storage for all uploads (CORRECT for B2)
const storage = multer.memoryStorage();

// ==================== FILENAME GENERATION MIDDLEWARE ====================
// This adds generated filenames to req.files for consistent naming
const generateFilenames = (req, res, next) => {
  if (req.files || req.file) {
    const files = req.files || [req.file].filter(Boolean);
    const subOpId = req.body.subOpId || "unknown";
    const timestamp = Date.now();

    files.forEach((file, index) => {
      if (file) {
        const originalName = file.originalname;
        const ext = path.extname(originalName);
        const baseName = path.basename(originalName, ext);

        // Generate unique filename
        const uniqueName = `${baseName}_${subOpId}_${timestamp}_${index}${ext}`;
        file.generatedName = uniqueName;
        file.originalName = originalName;

        // Also store file type for B2 folder organization
        if (file.mimetype.startsWith("video/")) {
          file.mediaType = "video";
        } else if (file.mimetype.startsWith("image/")) {
          file.mediaType = "image";
        } else if (file.fieldname === "techPack") {
          file.mediaType = "techpack";
        } else if (file.fieldname === "documents") {
          file.mediaType = "document";
        }
      }
    });
  }
  next();
};

// ==================== VIDEO UPLOAD CONFIG ====================
const videoUpload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 100MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Check if it's a video file - handle MIME types with codec parameters
    const cleanMimeType = file.mimetype.split(";")[0]; // Remove codec part
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

// ==================== IMAGE UPLOAD CONFIG ====================
const imageUpload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for images
    files: 1, // Limit to 1 file
  },
  fileFilter: (req, file, cb) => {
    // Check if it's an image file
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }

    // Check file extension
    const allowedExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif",
      ".bmp",
      ".tiff",
    ];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      return cb(
        new Error(
          `Unsupported image type. Allowed: ${allowedExtensions.join(", ")}`,
        ),
        false,
      );
    }

    cb(null, true);
  },
});

// ==================== FOLDER/DOCUMENTS UPLOAD CONFIG ====================
const folderUpload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit per file
    files: 10, // Maximum 10 files per upload
  },
  fileFilter: (req, file, cb) => {
    // Check file extension for documents
    const allowedExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".csv",
      ".txt",
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".zip",
      ".rar",
      ".ods",
    ];

    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "text/csv",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/zip",
      "application/x-zip-compressed",
      "application/x-rar-compressed",
      "application/vnd.oasis.opendocument.spreadsheet",
    ];

    const fileExtension = path.extname(file.originalname).toLowerCase();
    const isValidExtension = allowedExtensions.includes(fileExtension);
    const isValidMimeType = allowedMimeTypes.includes(file.mimetype);

    if (!isValidExtension && !isValidMimeType) {
      return cb(
        new Error(
          `Unsupported file type: ${
            file.originalname
          }. Allowed: ${allowedExtensions.join(", ")}`,
        ),
        false,
      );
    }

    cb(null, true);
  },
});

// ==================== ERROR HANDLING MIDDLEWARE ====================
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message:
          "File too large. Maximum size is: " +
          (error.field === "video"
            ? "500MB"
            : error.field === "image"
              ? "50MB"
              : "20MB"),
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Maximum is 10 files per upload",
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected file field. Check field name",
      });
    }
  } else if (error) {
    // This catches the fileFilter errors
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
  next();
};

// NOTE to handle helper videos
routes.get("/getVideos/:hOpId", controller.getVideos);
routes.post(
  "/uploadVideos",
  authMiddleware,
  videoUpload.single("video"),
  handleMulterError,
  generateFilenames, // Add filename generation
  controller.uploadVideos,
);
routes.delete("/deleteVideo/:ho_media_id", controller.deleteVideo);

// NOTE to handle helper images
routes.get("/getImages/:hOpId", controller.getImages);
routes.post(
  "/uploadImages",
  imageUpload.single("image"),
  handleMulterError,
  generateFilenames, // Add filename generation
  controller.uploadImage,
);

module.exports = routes;
