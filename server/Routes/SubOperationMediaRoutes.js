const express = require("express");
const routes = express.Router();
const multer = require("multer");
const path = require("path");
const controller = require("../controllers/SubOpMediaController");

// Use memory storage for all uploads
const storage = multer.memoryStorage();

// ==================== VIDEO UPLOAD CONFIG ====================
const videoUpload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB limit
    files: 1, // Limit to 1 file
  },
  fileFilter: (req, file, cb) => {
    // Check if it's a video file
    if (!file.mimetype.startsWith("video/")) {
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
          `Unsupported file type. Allowed: ${allowedExtensions.join(", ")}`
        ),
        false
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
      ".zip",
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
      "application/zip",
      "application/x-zip-compressed",
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
        message: "File too large",
        success: false,
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        message: "Too many files",
        success: false,
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        message: "Unexpected file field",
        success: false,
      });
    }
  } else if (error) {
    // This catches the fileFilter errors
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
  next();
};

// ==================== MEDIA ROUTES ====================

// !=============================== VIDEO ROUTES ===============================
routes.get("/getVideos/:subOpId", controller.getVideos);
routes.post(
  "/uploadVideos",
  videoUpload.single("video"),
  handleMulterError,
  controller.uploadVideo
);
routes.delete("/deleteVideo/:so_media_id", controller.deleteVideo);

// !=============================== IMAGE ROUTES ===============================
routes.get("/getImages/:subOpId", controller.getImages);
routes.post(
  "/uploadImages",
  imageUpload.single("image"),
  handleMulterError,
  controller.uploadImage
);
routes.delete("/deleteImage/:so_img_id", controller.deleteImage);

// !=============================== TECH PACK ROUTES ===============================
routes.get("/getTechPacks/:subOpId", controller.getTechPacks);
routes.post(
  "/uploadTechPack",
  folderUpload.single("techPack"),
  handleMulterError,
  controller.uploadTechPack
);
routes.delete("/deleteTechPack/:so_tech_id", controller.deleteTechPack);

// !=============================== FOLDER/DOCUMENTS ROUTES ===============================
routes.get("/getFolderDocuments/:subOpId", controller.getFolderDocuments);
routes.post(
  "/uploadFolder",
  folderUpload.array("documents", 10), // max 10 files
  handleMulterError,
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
