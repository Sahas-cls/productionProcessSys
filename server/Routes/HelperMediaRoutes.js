const express = require("express");
const routes = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const controller = require("../controllers/HelperMediaController");
const authMiddleware = require("../middlewares/AuthUser");

// ==================== VIDEO DISK STORAGE ====================
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/videos");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const subOpId = req.body.subOpId || "unknown";
    const uniqueName = `${baseName}_${subOpId}_${timestamp}${ext}`;
    file.generatedName = uniqueName; // preserve for controller
    cb(null, uniqueName);
  },
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024, files: 1 }, // 500MB
  fileFilter: (req, file, cb) => {
    const cleanMimeType = file.mimetype.split(";")[0];
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
    if (
      !allowedExtensions.includes(path.extname(file.originalname).toLowerCase())
    ) {
      return cb(
        new Error(
          `Unsupported video type. Allowed: ${allowedExtensions.join(", ")}`,
        ),
        false,
      );
    }

    cb(null, true);
  },
});

// ==================== MEMORY STORAGE FOR IMAGES/DOCUMENTS ====================
const memoryStorage = multer.memoryStorage();

// Images
const imageUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/"))
      return cb(new Error("Only image files allowed"), false);
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff"];
    if (!allowed.includes(path.extname(file.originalname).toLowerCase()))
      return cb(new Error("Unsupported image type"), false);
    cb(null, true);
  },
});

// Documents
const folderUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 20 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    const allowedExt = [
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
    const allowedMime = [
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

    if (
      !allowedExt.includes(path.extname(file.originalname).toLowerCase()) &&
      !allowedMime.includes(file.mimetype)
    ) {
      return cb(new Error("Unsupported file type"), false);
    }
    cb(null, true);
  },
});

// ==================== FILENAME GENERATION MIDDLEWARE ====================
const generateFilenames = (req, res, next) => {
  if (req.file || req.files) {
    const files = req.files || [req.file].filter(Boolean);
    const subOpId = req.body.subOpId || "unknown";
    const timestamp = Date.now();

    files.forEach((file, index) => {
      if (file) {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext);
        file.generatedName =
          file.generatedName ||
          `${base}_${subOpId}_${timestamp}_${index}${ext}`;
        if (file.mimetype.startsWith("video/")) file.mediaType = "video";
        else if (file.mimetype.startsWith("image/")) file.mediaType = "image";
        else if (file.fieldname === "techPack") file.mediaType = "techpack";
        else if (file.fieldname === "documents") file.mediaType = "document";
      }
    });
  }
  next();
};

// ==================== ERROR HANDLER ====================
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE")
      return res
        .status(400)
        .json({ success: false, message: "File too large" });
    if (err.code === "LIMIT_FILE_COUNT")
      return res
        .status(400)
        .json({ success: false, message: "Too many files" });
    if (err.code === "LIMIT_UNEXPECTED_FILE")
      return res
        .status(400)
        .json({ success: false, message: "Unexpected file field" });
  } else if (err)
    return res.status(400).json({ success: false, message: err.message });
  next();
};

// ==================== ROUTES ====================
// Videos
routes.get("/getVideos/:hOpId", controller.getVideos);
routes.post(
  "/uploadVideos",
  authMiddleware,
  videoUpload.single("video"),
  handleMulterError,
  generateFilenames,
  controller.uploadVideos,
);
routes.delete("/deleteVideo/:ho_media_id/:deleteVideo", controller.deleteVideo);

// Images
routes.get("/getImages/:hOpId", controller.getImages);
routes.post(
  "/uploadImages",
  imageUpload.single("image"),
  handleMulterError,
  generateFilenames,
  controller.uploadImage,
);
routes.delete("/deleteImage/:hOpId", controller.deleteImage);

module.exports = routes;
