const express = require("express");
const routes = express.Router();
const multer = require("multer");
const path = require("path");
const controller = require("../controllers/SubOpMediaController");
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
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    console.log("Multer receiving:", {
      mimetype: file.mimetype,
      originalname: file.originalname,
      extension: path.extname(file.originalname),
    });

    // Accept any video MIME type
    if (file.mimetype.startsWith("video/")) {
      console.log("✅ Accepting video file");
      return cb(null, true);
    }

    console.log("❌ Rejecting non-video file");
    return cb(new Error("Only video files are allowed"), false);
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
          `Unsupported image type. Allowed: ${allowedExtensions.join(", ")}`
        ),
        false
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
          }. Allowed: ${allowedExtensions.join(", ")}`
        ),
        false
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
            ? "1GB"
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

// ==================== MEDIA ROUTES ====================

// !=============================== VIDEO ROUTES ===============================
routes.get("/getVideos/:subOpId", controller.getVideos);
routes.post(
  "/uploadVideos",
  authMiddleware,
  videoUpload.single("video"),
  handleMulterError,
  generateFilenames, // Add filename generation
  controller.uploadVideo
);
routes.delete("/deleteVideo/:so_media_id", controller.deleteVideo);

// !=============================== IMAGE ROUTES ===============================
routes.get("/getImages/:subOpId", controller.getImages);
routes.post(
  "/uploadImages",
  imageUpload.single("image"),
  handleMulterError,
  generateFilenames, // Add filename generation
  controller.uploadImage
);
routes.delete("/deleteImage/:so_img_id", controller.deleteImage);

// !=============================== TECH PACK ROUTES ===============================
routes.get("/getTechPacks/:subOpId", controller.getTechPacks);
routes.post(
  "/uploadTechPack",
  folderUpload.single("techPack"),
  handleMulterError,
  generateFilenames, // Add filename generation
  controller.uploadTechPack
);
routes.delete("/deleteTechPack/:so_tech_id", controller.deleteTechPack);

// !=============================== FOLDER/DOCUMENTS ROUTES ===============================
routes.get("/getFolderDocuments/:subOpId", controller.getFolderDocuments);
routes.post(
  "/uploadFolder",
  folderUpload.array("documents", 10), // max 10 files
  handleMulterError,
  generateFilenames, // Add filename generation
  controller.uploadFolder
);
routes.delete(
  "/deleteFolderDocument/:so_folder_id",
  controller.deleteFolderDocument
);
routes.delete(
  "/deleteMultipleFolderDocuments",
  controller.deleteMultipleFolderDocuments
);

// !=============================== BULK MEDIA ROUTES ===============================
// routes.get("/getAllMedia/:subOpId", controller.getAllMedia);

module.exports = routes;
