require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const router = express.Router();

// ==================== PLATFORM DETECTION ====================
const IS_WINDOWS = process.platform === "win32";
const IS_LINUX = process.platform === "linux";

console.log("\n========== PLATFORM DETECTION ==========");
console.log("Platform:", process.platform);
console.log(
  "Environment:",
  IS_LINUX ? "🐧 Linux (DigitalOcean Droplet)" : "🪟 Windows",
);
console.log("=========================================\n");

// ==================== NETWORK CONFIGURATION ====================
// Windows configuration (local development)
const WINDOWS_CONFIG = {
  mappedDrive: "Y:",
  videosPath: path.join("Y:", "videos"),
  uncPath: `\\\\192.168.47.127\\operation bulletin assets\\videos`,
};

// Linux configuration (DigitalOcean Droplet)
const LINUX_CONFIG = {
  mountPoint: "/mnt/bulletin-assets",
  videosPath: "/mnt/bulletin-assets/videos",
  uncPath: `//192.168.47.127/operation bulletin assets/videos`, // Linux-style UNC
  sharePath: `//192.168.47.127/operation bulletin assets`,
};

// Select configuration based on platform
const CONFIG = IS_WINDOWS ? WINDOWS_CONFIG : LINUX_CONFIG;
const VIDEOS_PATH = CONFIG.videosPath;

console.log("\n========== NETWORK CONFIGURATION ==========");
console.log("Target Path:", VIDEOS_PATH);
console.log("UNC Path:", CONFIG.uncPath);
console.log("Platform:", IS_LINUX ? "🐧 Linux" : "🪟 Windows");
console.log("============================================\n");

// ==================== LINUX-SPECIFIC FUNCTIONS ====================
const checkLinuxMount = async () => {
  if (!IS_LINUX) return { success: true, diagnostics: [] };

  console.log("\n🔍 --- Checking Linux Mount Configuration ---");

  const diagnostics = {
    mountPointExists: false,
    mountPointAccessible: false,
    videosFolderExists: false,
    writeAccess: false,
    mountStatus: null,
    errors: [],
  };

  try {
    // Check 1: Does mount point directory exist?
    try {
      diagnostics.mountPointExists = fs.existsSync(CONFIG.mountPoint);
      if (!diagnostics.mountPointExists) {
        console.log(`Creating mount point: ${CONFIG.mountPoint}`);
        fs.mkdirSync(CONFIG.mountPoint, { recursive: true });
        diagnostics.mountPointExists = true;
      } else {
        console.log(`✅ Mount point exists: ${CONFIG.mountPoint}`);
      }
    } catch (error) {
      diagnostics.errors.push(`Failed to create mount point: ${error.message}`);
    }

    // Check 2: Check if share is mounted
    try {
      const { stdout } = await execPromise("mount | grep cifs");
      diagnostics.mountStatus = stdout;

      if (stdout.includes(CONFIG.sharePath)) {
        console.log(`✅ Windows share is mounted`);
      } else {
        console.log(`⚠️ Windows share not mounted, attempting to mount...`);

        // Try to mount the share
        const mountCmd = `mount -t cifs "${CONFIG.sharePath}" "${CONFIG.mountPoint}" -o username=${process.env.NETWORK_USERNAME},password=${process.env.NETWORK_PASSWORD},domain=${process.env.NETWORK_DOMAIN || "WORKGROUP"},uid=1000,gid=1000,file_mode=0755,dir_mode=0755,noperm`;

        try {
          await execPromise(mountCmd);
          console.log(`✅ Successfully mounted Windows share`);
        } catch (mountError) {
          diagnostics.errors.push(
            `Failed to mount share: ${mountError.message}`,
          );
        }
      }
    } catch (error) {
      diagnostics.errors.push(`Error checking mount status: ${error.message}`);
    }

    // Check 3: Can we access the mount point?
    try {
      fs.accessSync(CONFIG.mountPoint, fs.constants.R_OK | fs.constants.W_OK);
      diagnostics.mountPointAccessible = true;
      console.log(`✅ Mount point is accessible`);
    } catch (error) {
      diagnostics.errors.push(`Mount point not accessible: ${error.message}`);
    }

    // Check 4: Does videos folder exist?
    if (diagnostics.mountPointAccessible) {
      try {
        diagnostics.videosFolderExists = fs.existsSync(VIDEOS_PATH);
        if (!diagnostics.videosFolderExists) {
          console.log(`Creating videos folder: ${VIDEOS_PATH}`);
          fs.mkdirSync(VIDEOS_PATH, { recursive: true });
          diagnostics.videosFolderExists = true;
        } else {
          console.log(`✅ Videos folder exists`);
        }
      } catch (error) {
        diagnostics.errors.push(
          `Failed to create videos folder: ${error.message}`,
        );
      }
    }

    // Check 5: Test write access
    if (diagnostics.videosFolderExists) {
      const testFile = path.join(VIDEOS_PATH, `test-${Date.now()}.txt`);
      try {
        fs.writeFileSync(testFile, "Testing write access on Linux");
        console.log(`✅ Write access verified`);
        fs.unlinkSync(testFile);
        diagnostics.writeAccess = true;
      } catch (error) {
        diagnostics.errors.push(`Write test failed: ${error.message}`);
      }
    }

    console.log("\n📊 Linux Mount Diagnostic Summary:");
    console.log(
      `Mount Point Exists: ${diagnostics.mountPointExists ? "✅" : "❌"}`,
    );
    console.log(
      `Mount Point Accessible: ${diagnostics.mountPointAccessible ? "✅" : "❌"}`,
    );
    console.log(
      `Videos Folder: ${diagnostics.videosFolderExists ? "✅" : "❌"}`,
    );
    console.log(`Write Access: ${diagnostics.writeAccess ? "✅" : "❌"}`);

    if (diagnostics.errors.length > 0) {
      console.log("\n❌ Errors:");
      diagnostics.errors.forEach((err) => console.log(`  - ${err}`));
    }

    return {
      success:
        diagnostics.mountPointExists &&
        diagnostics.mountPointAccessible &&
        diagnostics.videosFolderExists &&
        diagnostics.writeAccess,
      diagnostics,
    };
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return {
      success: false,
      diagnostics: { errors: [`Unexpected error: ${error.message}`] },
    };
  }
};

// ==================== WINDOWS-SPECIFIC FUNCTIONS ====================
const checkWindowsDrive = () => {
  if (!IS_WINDOWS) return { success: true, diagnostics: [] };

  console.log("\n🔍 --- Checking Windows Drive Configuration ---");

  const diagnostics = {
    driveExists: false,
    videosFolderExists: false,
    writeAccess: false,
    networkConnections: [],
    errors: [],
  };

  try {
    // Check if drive exists
    diagnostics.driveExists = fs.existsSync("Y:");

    if (diagnostics.driveExists) {
      // Check videos folder
      diagnostics.videosFolderExists = fs.existsSync(VIDEOS_PATH);

      // Test write access
      if (diagnostics.videosFolderExists) {
        const testFile = path.join(VIDEOS_PATH, `test-${Date.now()}.txt`);
        try {
          fs.writeFileSync(testFile, "test");
          fs.unlinkSync(testFile);
          diagnostics.writeAccess = true;
        } catch (error) {
          diagnostics.errors.push(`Write test failed: ${error.message}`);
        }
      }
    } else {
      diagnostics.errors.push("Y: drive not found");
    }

    // Check network connections
    try {
      const { stdout } = require("child_process").execSync("net use", {
        encoding: "utf8",
      });
      const lines = stdout.split("\n");
      lines.forEach((line) => {
        if (line.includes("Y:")) {
          diagnostics.networkConnections.push(line.trim());
        }
      });
    } catch (error) {
      diagnostics.errors.push(`Error checking net use: ${error.message}`);
    }

    return {
      success:
        diagnostics.driveExists &&
        diagnostics.videosFolderExists &&
        diagnostics.writeAccess,
      diagnostics,
    };
  } catch (error) {
    return {
      success: false,
      diagnostics: { errors: [`Unexpected error: ${error.message}`] },
    };
  }
};

// ==================== MAIN STORAGE CHECK ====================
const checkStorageAccess = async () => {
  console.log("\n🔍 --- Running Platform-Specific Storage Diagnostics ---");

  let result;
  if (IS_LINUX) {
    result = await checkLinuxMount();
  } else {
    result = checkWindowsDrive();
  }

  if (!result.success) {
    const errorDetails = {
      message: "STORAGE NOT ACCESSIBLE",
      platform: IS_LINUX ? "linux" : "windows",
      targetPath: VIDEOS_PATH,
      uncPath: CONFIG.uncPath,
      diagnostics: result.diagnostics,
      troubleshooting: IS_LINUX
        ? [
            "1. Install cifs-utils: sudo apt-get install cifs-utils -y",
            "2. Create mount point: sudo mkdir -p /mnt/windows_share",
            "3. Test connection: smbclient -L //192.168.47.127 -U administrator",
            "4. Mount manually: sudo mount -t cifs '//192.168.47.127/operation bulletin assets' /mnt/windows_share -o username=administrator",
            "5. Check credentials in .env file",
            "6. Ensure network connectivity to 192.168.47.127 (port 445)",
          ]
        : [
            "1. Check if Y: drive is mapped: Run 'net use' in Command Prompt",
            "2. Verify network path: Should be mapped to \\\\192.168.47.127\\operation bulletin assets",
            "3. Ensure 'videos' folder exists on Y: drive",
            "4. Check Windows credentials",
          ],
    };

    throw new Error(JSON.stringify(errorDetails, null, 2));
  }

  return true;
};

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    console.log("\n📤 --- Processing file upload ---");
    console.log("File received:", file.originalname);
    console.log("File type:", file.mimetype);
    console.log("Platform:", IS_LINUX ? "🐧 Linux" : "🪟 Windows");

    try {
      // Check storage accessibility
      await checkStorageAccess();

      console.log(`✅ Writing to: ${VIDEOS_PATH}`);
      cb(null, VIDEOS_PATH);
    } catch (error) {
      console.error("❌ STORAGE ERROR:", error.message);
      cb(error);
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

// File filter
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
    cb(new Error(`Invalid file type: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: fileFilter,
});

// Upload endpoint
router.post("/test-video-upload", upload.single("video"), async (req, res) => {
  console.log("\n🎯 ========== UPLOAD REQUEST ==========");
  console.log("path == = = ", req.file.path);
  console.log("req body: ", req);
  return;
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      path: req.file.path,
      platform: IS_LINUX ? "linux" : "windows",
      uploadDate: new Date().toISOString(),
    };

    if (fs.existsSync(req.file.path)) {
      const stats = fs.statSync(req.file.path);
      fileInfo.fileStats = {
        created: stats.birthtime,
        modified: stats.mtime,
        size: stats.size,
      };
    }

    res.status(200).json({
      success: true,
      message: `Video uploaded to ${IS_LINUX ? "mounted share" : "network drive"}`,
      data: fileInfo,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Diagnostics endpoint
router.get("/storage-diagnostics", async (req, res) => {
  let diagnostics;

  if (IS_LINUX) {
    diagnostics = await checkLinuxMount();
  } else {
    diagnostics = checkWindowsDrive();
  }

  res.json({
    platform: IS_LINUX ? "linux" : "windows",
    config: CONFIG,
    diagnostics: diagnostics.diagnostics,
    ready: diagnostics.success,
  });
});

// Error handling
router.use((error, req, res, next) => {
  console.error("❌ Error:", error);

  try {
    const parsedError = JSON.parse(error.message);
    return res.status(500).json({
      success: false,
      message: "Storage not accessible",
      details: parsedError,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Upload failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
