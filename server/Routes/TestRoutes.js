require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const router = express.Router();

// ==================== DEBUGGING SECTION ====================
console.log("\n========== ENVIRONMENT VARIABLES DEBUG ==========");
console.log("Current directory:", __dirname);
console.log(
  "Process running as user:",
  process.env.USERNAME || process.env.USER,
);
console.log("Computer name:", process.env.COMPUTERNAME);

// Check if .env variables are loaded
console.log("\nEnvironment variables status:");
console.log(
  "NETWORK_USERNAME:",
  process.env.NETWORK_USERNAME ? "✓ DEFINED" : "✗ UNDEFINED",
);
console.log(
  "NETWORK_PASSWORD:",
  process.env.NETWORK_PASSWORD ? "✓ DEFINED" : "✗ UNDEFINED",
);
console.log(
  "NETWORK_DOMAIN:",
  process.env.NETWORK_DOMAIN ? "✓ DEFINED" : "✗ UNDEFINED",
);
console.log("================================================\n");
// ==================== END DEBUGGING ====================

// ==================== NETWORK CONFIGURATION ====================
// Use the mapped Y: drive that you already have connected
const MAPPED_DRIVE = "Y:";
const VIDEOS_FOLDER = "videos";
const NETWORK_VIDEOS_PATH = path.join(MAPPED_DRIVE, VIDEOS_FOLDER);

// UNC path for reference only - DO NOT USE DIRECTLY
const UNC_PATH = `\\\\192.168.47.127\\operation bulletin assets\\videos`;

console.log("\n========== NETWORK CONFIGURATION ==========");
console.log("Mapped Drive:", MAPPED_DRIVE);
console.log("Target Path:", NETWORK_VIDEOS_PATH);
console.log("UNC Path (reference only):", UNC_PATH);
console.log("============================================\n");

// Function to check if mapped drive is accessible
const checkMappedDriveAccess = () => {
  console.log("\n--- Checking mapped drive access ---");

  try {
    // Check if Y: drive exists
    if (!fs.existsSync(MAPPED_DRIVE)) {
      console.log(`✗ Drive ${MAPPED_DRIVE} is not accessible`);
      return false;
    }
    console.log(`✓ Drive ${MAPPED_DRIVE} is accessible`);

    // Check/Create videos folder
    if (!fs.existsSync(NETWORK_VIDEOS_PATH)) {
      console.log(`Creating videos folder: ${NETWORK_VIDEOS_PATH}`);
      fs.mkdirSync(NETWORK_VIDEOS_PATH, { recursive: true });
    } else {
      console.log(`✓ Videos folder exists: ${NETWORK_VIDEOS_PATH}`);
    }

    // Test write access
    const testFile = path.join(NETWORK_VIDEOS_PATH, `test-${Date.now()}.txt`);
    fs.writeFileSync(testFile, "test write access");
    console.log(`✓ Write access verified`);
    fs.unlinkSync(testFile);
    console.log(`✓ Test file cleaned up`);

    // Show current connections
    try {
      const { stdout } = execSync("net use", { encoding: "utf8" });
      console.log("\nCurrent network connections:");
      const lines = stdout.split("\n");
      lines.forEach((line) => {
        if (line.includes("Y:")) {
          console.log(`  ✓ ${line.trim()}`);
        }
      });
    } catch (e) {}

    return true;
  } catch (error) {
    console.error(`✗ Error accessing mapped drive:`, error.message);
    return false;
  }
};

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("\n--- Processing file upload destination ---");
    console.log("File received:", file.originalname);
    console.log("File type:", file.mimetype);

    try {
      // Check if Y: drive is accessible
      const driveAccessible = checkMappedDriveAccess();

      if (driveAccessible) {
        console.log(`✓ Using network drive: ${NETWORK_VIDEOS_PATH}`);
        return cb(null, NETWORK_VIDEOS_PATH);
      }

      // Fallback to local storage
      console.warn("⚠ Network drive not accessible, using local fallback");
      const localPath = path.join(__dirname, "../uploads/videos");

      if (!fs.existsSync(localPath)) {
        console.log(`Creating local directory: ${localPath}`);
        fs.mkdirSync(localPath, { recursive: true });
      }

      console.log(`✓ Using local fallback path: ${localPath}`);
      return cb(null, localPath);
    } catch (error) {
      console.error("✗ Error in destination handler:", error.message);

      // Emergency fallback
      const localPath = path.join(__dirname, "../uploads/videos");
      if (!fs.existsSync(localPath)) {
        fs.mkdirSync(localPath, { recursive: true });
      }
      cb(null, localPath);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    const fileName = file.fieldname + "-" + uniqueSuffix + fileExtension;
    console.log(`Generated filename: ${fileName}`);
    cb(null, fileName);
  },
});

// File filter to only allow video files
const fileFilter = (req, file, cb) => {
  console.log("Checking file type:", file.mimetype);

  const allowedMimeTypes = [
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
    "video/webm",
    "video/ogg",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    console.log("✓ File type allowed");
    cb(null, true);
  } else {
    console.log("✗ File type not allowed");
    cb(new Error("Invalid file type. Only video files are allowed."), false);
  }
};

// Configure multer with limits
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: fileFilter,
});

// Handle video upload
router.post(
  "/test-video-upload",
  upload.single("video"),
  async (req, res, next) => {
    console.log("\n========== UPLOAD REQUEST RECEIVED ==========");
    console.log("Request time:", new Date().toISOString());

    try {
      if (!req.file) {
        console.log("✗ No file in request");
        return res.status(400).json({
          success: false,
          message: "No video file uploaded",
        });
      }

      console.log("✓ File processed successfully");
      console.log("File details:", {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        destination: req.file.destination,
        path: req.file.path,
      });

      // Determine if file was saved to network drive
      const isNetworkStorage = req.file.destination.includes(MAPPED_DRIVE);

      // Get file information
      const fileInfo = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path,
        destination: req.file.destination,
        uploadDate: new Date().toISOString(),
        storageType: isNetworkStorage ? "network" : "local",
        networkPath: isNetworkStorage
          ? req.file.path.replace(MAPPED_DRIVE, UNC_PATH.split("\\videos")[0])
          : null,
      };

      // Verify file was written
      if (fs.existsSync(req.file.path)) {
        console.log(`✓ File successfully written to: ${req.file.path}`);
        const stats = fs.statSync(req.file.path);
        fileInfo.fileStats = {
          created: stats.birthtime,
          modified: stats.mtime,
          size: stats.size,
        };
      }

      console.log("✓ Sending success response");
      res.status(200).json({
        success: true,
        message: isNetworkStorage
          ? `Video uploaded successfully to network drive (Y:\\videos)`
          : "Video uploaded successfully to local storage (network fallback)",
        data: fileInfo,
      });
    } catch (error) {
      console.error("✗ Upload error:", error);
      res.status(500).json({
        success: false,
        message: "Error uploading video",
        error: error.message,
      });
    }
    console.log("========== UPLOAD COMPLETE ==========\n");
  },
);

// Endpoint to check network drive status
router.get("/network-status", (req, res) => {
  const status = {
    mappedDrive: MAPPED_DRIVE,
    targetPath: NETWORK_VIDEOS_PATH,
    accessible: false,
    connections: [],
  };

  try {
    // Check if drive exists
    status.accessible = fs.existsSync(MAPPED_DRIVE);

    if (status.accessible) {
      // Check videos folder
      status.videosFolderExists = fs.existsSync(NETWORK_VIDEOS_PATH);

      // Get drive info
      try {
        const { stdout } = execSync("net use", { encoding: "utf8" });
        const lines = stdout.split("\n");
        lines.forEach((line) => {
          if (line.includes(MAPPED_DRIVE)) {
            status.connections.push(line.trim());
          }
        });
      } catch (e) {}
    }

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
  console.error("✗ Multer error:", error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 100MB",
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  next();
});

module.exports = router;
