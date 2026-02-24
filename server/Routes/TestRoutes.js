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

// UNC path for reference only
const UNC_PATH = `\\\\192.168.47.127\\operation bulletin assets\\videos`;

console.log("\n========== NETWORK CONFIGURATION ==========");
console.log("Mapped Drive:", MAPPED_DRIVE);
console.log("Target Path:", NETWORK_VIDEOS_PATH);
console.log("UNC Path:", UNC_PATH);
console.log("============================================\n");

// Enhanced function to check mapped drive access with detailed error information
const checkMappedDriveAccess = () => {
  console.log("\n🔍 --- Detailed Network Drive Diagnostics ---");

  const diagnostics = {
    driveExists: false,
    videosFolderExists: false,
    writeAccess: false,
    networkConnections: [],
    errors: [],
  };

  try {
    // Check 1: Does the Y: drive exist?
    try {
      diagnostics.driveExists = fs.existsSync(MAPPED_DRIVE);
      if (diagnostics.driveExists) {
        console.log(`✅ Drive ${MAPPED_DRIVE} exists`);
      } else {
        const error = `❌ Drive ${MAPPED_DRIVE} does not exist`;
        console.log(error);
        diagnostics.errors.push(error);
      }
    } catch (error) {
      diagnostics.errors.push(`Error checking drive: ${error.message}`);
    }

    // Check 2: Check network connections using net use
    try {
      const { stdout } = execSync("net use", { encoding: "utf8" });
      const lines = stdout.split("\n");
      let driveFound = false;

      lines.forEach((line) => {
        if (line.includes(MAPPED_DRIVE)) {
          driveFound = true;
          const match = line.match(/([A-Z]:)\s+(\\\\[^\s]+)/);
          if (match) {
            const networkPath = match[2];
            diagnostics.networkConnections.push({
              drive: MAPPED_DRIVE,
              networkPath: networkPath,
              status: line.trim(),
            });
            console.log(`✅ Y: drive mapped to: ${networkPath}`);
          }
        }
      });

      if (!driveFound) {
        const error = `❌ No network connection found for ${MAPPED_DRIVE} drive. Run 'net use' command to check connections.`;
        diagnostics.errors.push(error);
        console.log(error);
      }
    } catch (error) {
      diagnostics.errors.push(`Error checking net use: ${error.message}`);
    }

    // Check 3: Does videos folder exist?
    if (diagnostics.driveExists) {
      try {
        diagnostics.videosFolderExists = fs.existsSync(NETWORK_VIDEOS_PATH);
        if (diagnostics.videosFolderExists) {
          console.log(`✅ Videos folder exists: ${NETWORK_VIDEOS_PATH}`);
        } else {
          console.log(
            `⚠️ Videos folder does not exist, attempting to create...`,
          );
          try {
            fs.mkdirSync(NETWORK_VIDEOS_PATH, { recursive: true });
            diagnostics.videosFolderExists = true;
            console.log(`✅ Videos folder created successfully`);
          } catch (mkdirError) {
            const error = `❌ Failed to create videos folder: ${mkdirError.message}`;
            diagnostics.errors.push(error);
            console.log(error);
          }
        }
      } catch (error) {
        diagnostics.errors.push(
          `Error checking videos folder: ${error.message}`,
        );
      }
    }

    // Check 4: Test write access
    if (diagnostics.driveExists && diagnostics.videosFolderExists) {
      const testFile = path.join(
        NETWORK_VIDEOS_PATH,
        `write-test-${Date.now()}.txt`,
      );
      try {
        fs.writeFileSync(testFile, "Testing write access to network drive");
        console.log(`✅ Write access verified - test file created`);
        fs.unlinkSync(testFile);
        console.log(`✅ Test file cleaned up`);
        diagnostics.writeAccess = true;
      } catch (writeError) {
        const error = `❌ Write access failed: ${writeError.message}`;
        diagnostics.errors.push(error);
        console.log(error);

        // Check permissions
        try {
          const stats = fs.statSync(NETWORK_VIDEOS_PATH);
          console.log(`📁 Folder permissions:`, {
            mode: stats.mode,
            uid: stats.uid,
            gid: stats.gid,
          });
        } catch (statError) {}
      }
    }

    // Summary
    console.log("\n📊 --- Diagnostic Summary ---");
    console.log(`Drive Exists: ${diagnostics.driveExists ? "✅" : "❌"}`);
    console.log(
      `Videos Folder: ${diagnostics.videosFolderExists ? "✅" : "❌"}`,
    );
    console.log(`Write Access: ${diagnostics.writeAccess ? "✅" : "❌"}`);

    if (diagnostics.errors.length > 0) {
      console.log("\n❌ Errors Found:");
      diagnostics.errors.forEach((err, index) => {
        console.log(`  ${index + 1}. ${err}`);
      });
    } else {
      console.log(
        "\n✅ All checks passed - Network drive is ready for writing",
      );
    }
    console.log("----------------------------------------\n");

    return {
      success:
        diagnostics.driveExists &&
        diagnostics.videosFolderExists &&
        diagnostics.writeAccess,
      diagnostics: diagnostics,
    };
  } catch (error) {
    console.error("❌ Unexpected error during diagnostics:", error);
    return {
      success: false,
      diagnostics: {
        errors: [`Unexpected error: ${error.message}`],
      },
    };
  }
};

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("\n📤 --- Processing file upload ---");
    console.log("File received:", file.originalname);
    console.log("File type:", file.mimetype);
    console.log("File size:", file.size);

    // Run comprehensive diagnostics
    const driveStatus = checkMappedDriveAccess();

    if (driveStatus.success) {
      console.log(`✅ Writing to network drive: ${NETWORK_VIDEOS_PATH}`);
      cb(null, NETWORK_VIDEOS_PATH);
    } else {
      // Create detailed error message for developer
      const errorDetails = {
        message: "NETWORK DRIVE NOT ACCESSIBLE",
        drive: MAPPED_DRIVE,
        targetPath: NETWORK_VIDEOS_PATH,
        uncPath: UNC_PATH,
        diagnostics: driveStatus.diagnostics,
        troubleshooting: [
          "1. Check if Y: drive is mapped: Run 'net use' in Command Prompt",
          "2. Verify network path: Should be mapped to \\\\192.168.47.127\\operation bulletin assets",
          "3. Ensure 'videos' folder exists on Y: drive or can be created",
          "4. Check Windows credentials: The user running Node.js must have write permissions",
          "5. Try accessing Y: drive manually in File Explorer",
          "6. Restart your computer if network drive is stuck",
        ],
      };

      console.error(
        "❌ NETWORK DRIVE ERROR:",
        JSON.stringify(errorDetails, null, 2),
      );

      // Throw error with detailed message
      cb(new Error(JSON.stringify(errorDetails, null, 2)));
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    const fileName = file.fieldname + "-" + uniqueSuffix + fileExtension;
    console.log(`📄 Generated filename: ${fileName}`);
    cb(null, fileName);
  },
});

// File filter to only allow video files
const fileFilter = (req, file, cb) => {
  console.log("🔍 Checking file type:", file.mimetype);

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
    console.log("✅ File type allowed");
    cb(null, true);
  } else {
    console.log("❌ File type not allowed");
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Only video files are allowed.`,
      ),
      false,
    );
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
    console.log("\n🎯 ========== UPLOAD REQUEST RECEIVED ==========");
    console.log("Request time:", new Date().toISOString());

    try {
      if (!req.file) {
        console.log("❌ No file in request");
        return res.status(400).json({
          success: false,
          message: "No video file uploaded",
        });
      }

      console.log("✅ File processed successfully");
      console.log("📁 File details:", {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        destination: req.file.destination,
        path: req.file.path,
      });

      // Verify file was written
      if (fs.existsSync(req.file.path)) {
        console.log(`✅ File successfully written to: ${req.file.path}`);
        const stats = fs.statSync(req.file.path);

        // Get UNC path equivalent for reference
        const uncFilePath = req.file.path.replace(
          MAPPED_DRIVE,
          UNC_PATH.split("\\videos")[0],
        );

        console.log("\n📊 File Statistics:");
        console.log(`  - Size: ${stats.size} bytes`);
        console.log(`  - Created: ${stats.birthtime}`);
        console.log(`  - Modified: ${stats.mtime}`);
        console.log(`  - Network Path (UNC): ${uncFilePath}`);

        res.status(200).json({
          success: true,
          message: "Video uploaded successfully to network drive",
          data: {
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            localPath: req.file.path,
            networkPath: uncFilePath,
            uploadDate: new Date().toISOString(),
            fileStats: {
              created: stats.birthtime,
              modified: stats.mtime,
              size: stats.size,
            },
          },
        });
      } else {
        throw new Error("File not found after write operation");
      }
    } catch (error) {
      console.error("❌ Upload error:", error);
      res.status(500).json({
        success: false,
        message: "Error uploading video to network drive",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
    console.log("========== UPLOAD COMPLETE ==========\n");
  },
);

// Enhanced endpoint to check network drive status with detailed diagnostics
router.get("/network-diagnostics", (req, res) => {
  const driveStatus = checkMappedDriveAccess();

  // Add system information
  const systemInfo = {
    platform: process.platform,
    nodeVersion: process.version,
    user: process.env.USERNAME || process.env.USER,
    computerName: process.env.COMPUTERNAME,
    currentTime: new Date().toISOString(),
  };

  res.json({
    system: systemInfo,
    configuration: {
      mappedDrive: MAPPED_DRIVE,
      videosPath: NETWORK_VIDEOS_PATH,
      uncPath: UNC_PATH,
    },
    diagnostics: driveStatus.diagnostics,
    ready: driveStatus.success,
  });
});

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
  console.error("❌ Multer error:", error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 100MB",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
    return res.status(400).json({
      success: false,
      message: "Upload error",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  if (error) {
    // Try to parse if it's our detailed network error
    try {
      const parsedError = JSON.parse(error.message);
      return res.status(500).json({
        success: false,
        message: "Network drive not accessible",
        details: parsedError,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Regular error
      return res.status(500).json({
        success: false,
        message: "Upload failed",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  next();
});

module.exports = router;
