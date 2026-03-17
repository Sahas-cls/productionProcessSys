const express = require("express");
const routes = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const controller = require("../controllers/SubOpMediaController");
const authMiddleware = require("../middlewares/AuthUser");

// ==================== STORAGE CONFIG ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, "../tempUploads");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const uniqueName = `${baseName}_${Date.now()}${ext}`;
    cb(null, uniqueName);
  },
});

const MStorage = multer.memoryStorage(); // use to upload images & folder documents

// ==================== FILE FILTERS ====================

const videoFilterFunction = (req, file, cb) => {
  const cleanMimeType = file.mimetype.split(";")[0]; // remove codec info
  if (!cleanMimeType.startsWith("video/"))
    return cb(new Error("Only video files are allowed"), false);

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

  if (!allowedExtensions.includes(fileExtension))
    return cb(
      new Error(
        `Unsupported video type. Allowed: ${allowedExtensions.join(", ")}`,
      ),
      false,
    );

  cb(null, true);
};

const videoUpload = multer({
  MStorage,
  limits: { fileSize: 500 * 1024 * 1024, files: 1 }, // 500MB
  fileFilter: videoFilterFunction,
});

// ==================== FILENAME GENERATION MIDDLEWARE ====================
const generateFilenames = (req, res, next) => {
  if (req.files || req.file) {
    const files = req.files || [req.file].filter(Boolean);
    const subOpId = req.body.subOpId || "unknown";
    const timestamp = Date.now();

    files.forEach((file, index) => {
      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext);
      const uniqueName = `${baseName}_${subOpId}_${timestamp}_${index}${ext}`;

      file.generatedName = uniqueName;
      file.originalName = file.originalname;

      if (file.mimetype.startsWith("video/")) file.mediaType = "video";
      else if (file.mimetype.startsWith("image/")) file.mediaType = "image";
      else if (file.fieldname === "techPack") file.mediaType = "techpack";
      else if (file.fieldname === "documents") file.mediaType = "document";
    });
  }
  next();
};

// ==================== IMAGE UPLOAD CONFIG ====================
const imageUpload = multer({
  storage: MStorage,
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
  storage: MStorage,
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
    if (error.code === "LIMIT_FILE_SIZE")
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${
          error.field === "video"
            ? "500MB"
            : error.field === "image"
              ? "50MB"
              : "20MB"
        }`,
      });

    if (error.code === "LIMIT_FILE_COUNT")
      return res.status(400).json({
        success: false,
        message: "Too many files. Maximum is 10 per upload",
      });

    if (error.code === "LIMIT_UNEXPECTED_FILE")
      return res.status(400).json({
        success: false,
        message: "Unexpected file field. Check field name",
      });
  } else if (error) {
    return res.status(400).json({ success: false, message: error.message });
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
  generateFilenames,
  controller.uploadVideo,
);
routes.delete("/deleteVideo/:so_media_id", controller.deleteSubOperationVideo);

// !=============================== IMAGE ROUTES ===============================
routes.get("/getImages/:subOpId", controller.getImages);
routes.post(
  "/uploadImages",
  imageUpload.single("image"),
  handleMulterError,
  generateFilenames, // Add filename generation -
  controller.uploadImage,
);
routes.delete("/deleteImage/:so_img_id", controller.deleteImage);

// !=============================== TECH PACK ROUTES ===============================
routes.get("/getStyleTechPacks/:subOpId", controller.getStyleTechPacks);
routes.post(
  "/uploadTechPack",
  folderUpload.single("techPack"),
  handleMulterError,
  generateFilenames, // Add filename generation
  controller.uploadTechPack,
);
routes.delete("/deleteTechPack/:so_tech_id", controller.deleteTechPack);

// !=============================== FOLDER/DOCUMENTS ROUTES ===============================
routes.get("/getFolderDocuments/:styleId", controller.getFolderDocuments);
routes.post(
  "/uploadFolder",
  folderUpload.array("documents", 10), // max 10 files
  handleMulterError,
  generateFilenames, // Add filename generation
  controller.uploadFolder,
);
routes.delete(
  "/deleteFolderDocument/:so_folder_id",
  controller.deleteFolderDocument,
);
routes.delete(
  "/deleteMultipleFolderDocuments",
  controller.deleteMultipleFolderDocuments,
);

// !=============================== BULK MEDIA ROUTES ===============================
// routes.get("/getAllMedia/:subOpId", controller.getAllMedia);

module.exports = routes;
