const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const db = require("./models");
const multer = require("multer");
const path = require("path");
const morgan = require("morgan");
const fs = require("fs"); // ADD THIS - it was missing

// ==================== Load environment variables ====================
require("dotenv").config();

const app = express();
const upload = multer();

// ==================== MIDDLEWARES ====================
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

// ==================== STATIC FILE SERVING FOR NETWORK STORAGE ====================

// Define the base UNC path for the new storage location
const STORAGE_UNC_PATH =
  process.platform == "win32" ? "Y:\\" : "/mnt/bulletin-assets";

// Helper function to validate and sanitize paths
const validatePath = (reqPath) => {
  // Prevent directory traversal attacks
  const normalized = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, "");
  return normalized;
};

//BUG debug test
// Add this near your other routes
app.get("/api/debug/video-exists/:filename(*)", (req, res) => {
  const filename = req.params[0];
  const videoPath = path.join(STORAGE_UNC_PATH, "SubOpVideos", filename);

  console.log("Checking video existence:");
  console.log("Filename:", filename);
  console.log("Full path:", videoPath);

  fs.access(videoPath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error("File does not exist:", err);
      return res.status(404).json({
        exists: false,
        path: videoPath,
        error: err.message,
      });
    }

    // Get file stats
    fs.stat(videoPath, (statErr, stats) => {
      if (statErr) {
        return res.json({
          exists: true,
          path: videoPath,
          error: statErr.message,
        });
      }

      res.json({
        exists: true,
        path: videoPath,
        size: stats.size,
        isFile: stats.isFile(),
        permissions: {
          readable: true, // You might want to check actual permissions
        },
      });
    });
  });
});

// Videos route
// Replace your current /videos route with this enhanced version
app.use(
  "/videosTest",
  (req, res, next) => {
    const requestedPath = req.path;
    console.log("📽️ Video request received:", requestedPath);

    if (requestedPath.includes("..")) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Decode the URL path
    const decodedPath = decodeURIComponent(requestedPath);
    const fullPath = path.join(STORAGE_UNC_PATH, "SubOpVideos", decodedPath);

    console.log("Decoded path:", decodedPath);
    console.log("Full filesystem path:", fullPath);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.error("File not found:", fullPath);
      return res.status(404).json({
        error: "Video not found",
        path: requestedPath,
        fullPath: fullPath,
      });
    }

    // Get file stats for debugging
    try {
      const stats = fs.statSync(fullPath);
      console.log("File found, size:", stats.size, "bytes");

      // Check if file is empty
      if (stats.size === 0) {
        console.error("File is empty:", fullPath);
        return res.status(500).json({ error: "Video file is empty" });
      }
    } catch (statErr) {
      console.error("Error getting file stats:", statErr);
    }

    next();
  },
  express.static(path.join(STORAGE_UNC_PATH, "SubOpVideos"), {
    setHeaders: (res, filePath) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Accept-Ranges", "bytes");

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        ".mp4": "video/mp4",
        ".avi": "video/x-msvideo",
        ".mov": "video/quicktime",
        ".mkv": "video/x-matroska",
        ".webm": "video/webm",
        ".wmv": "video/x-ms-wmv",
        ".flv": "video/x-flv",
        ".m4v": "video/x-m4v",
        ".mpg": "video/mpeg",
        ".mpeg": "video/mpeg",
        ".3gp": "video/3gpp",
      };
      if (mimeTypes[ext]) {
        res.setHeader("Content-Type", mimeTypes[ext]);
      }
    },
  }),
);

// Images route
app.use(
  "/subop-images",
  (req, res, next) => {
    if (req.path.includes("..")) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  },
  express.static(path.join(STORAGE_UNC_PATH, "SubOpImages"), {
    setHeaders: (res, filePath) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=86400");

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".bmp": "image/bmp",
        ".tiff": "image/tiff",
        ".tif": "image/tiff",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
      };
      if (mimeTypes[ext]) {
        res.setHeader("Content-Type", mimeTypes[ext]);
      }
    },
  }),
);

// Tech packs route
app.use(
  "/techpacks",
  (req, res, next) => {
    if (req.path.includes("..")) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  },
  express.static(path.join(STORAGE_UNC_PATH, "SubOpTechPacks"), {
    setHeaders: (res, filePath) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=86400");

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        ".xls": "application/vnd.ms-excel",
        ".xlsx":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".csv": "text/csv",
        ".ods": "application/vnd.oasis.opendocument.spreadsheet",
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".txt": "text/plain",
        ".zip": "application/zip",
        ".rar": "application/x-rar-compressed",
        ".7z": "application/x-7z-compressed",
      };
      if (mimeTypes[ext]) {
        res.setHeader("Content-Type", mimeTypes[ext]);
      } else {
        res.setHeader("Content-Type", "application/octet-stream");
      }

      // Set download headers for certain file types
      if (
        [".xls", ".xlsx", ".csv", ".ods", ".pdf", ".doc", ".docx"].includes(ext)
      ) {
        res.setHeader("Content-Disposition", "inline");
      }
    },
  }),
);

// Documents/Folders route
app.use(
  "/documents",
  (req, res, next) => {
    if (req.path.includes("..")) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  },
  express.static(path.join(STORAGE_UNC_PATH, "SubOpFolders"), {
    setHeaders: (res, filePath) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=86400");

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        // Documents
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls": "application/vnd.ms-excel",
        ".xlsx":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".csv": "text/csv",
        ".txt": "text/plain",
        ".ods": "application/vnd.oasis.opendocument.spreadsheet",

        // Images
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".bmp": "image/bmp",

        // Archives
        ".zip": "application/zip",
        ".rar": "application/x-rar-compressed",
        ".7z": "application/x-7z-compressed",
        ".tar": "application/x-tar",
        ".gz": "application/gzip",
      };
      if (mimeTypes[ext]) {
        res.setHeader("Content-Type", mimeTypes[ext]);
      } else {
        res.setHeader("Content-Type", "application/octet-stream");
      }

      // Set appropriate disposition
      if ([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt"].includes(ext)) {
        res.setHeader("Content-Disposition", "inline");
      }
    },
  }),
);

// test


//BUG debug
const debugVideoUrl = async (item) => {
  const videoUrl = getVideoUrl(item);
  console.log("Testing video URL:", videoUrl);

  try {
    // Test with HEAD request
    const response = await fetch(videoUrl, { method: "HEAD" });
    console.log("HEAD request response:", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (!response.ok) {
      console.error("Video URL not accessible:", response.status);
      Swal.fire({
        title: "Video Debug Info",
        html: `
          <p><strong>URL:</strong> ${videoUrl}</p>
          <p><strong>Status:</strong> ${response.status}</p>
          <p><strong>Content-Type:</strong> ${response.headers.get("content-type")}</p>
          <p><strong>Content-Length:</strong> ${response.headers.get("content-length")}</p>
        `,
        icon: response.ok ? "success" : "error",
      });
    }
  } catch (error) {
    console.error("Error testing video URL:", error);
    Swal.fire({
      title: "Video Debug Error",
      text: error.message,
      icon: "error",
    });
  }
};

// ==================== CSRF Token ====================
app.get("/api/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// ==================== ROUTES ====================
// Users
const userRoutes = require("./Routes/UserRoutes.js");
app.use("/api/user/", userRoutes);

// Factories
const factoryRoutes = require("./Routes/FactoryRoutes.js");
app.use("/api/factories/", factoryRoutes);

// Departments
const departmentRoutes = require("./Routes/DepartmentRoutes.js");
app.use("/api/departments/", departmentRoutes);

// Customers
const customerRoutes = require("./Routes/CustomerRoutes.js");
app.use("/api/customers/", customerRoutes);

// Customer types
const customerTypesRoute = require("./Routes/CustomerTypesRoutes.js");
app.use("/api/customerTypes/", customerTypesRoute);

// Seasons
const seasonRoutes = require("./Routes/SeasonRoutes.js");
app.use("/api/seasons/", seasonRoutes);

// Styles
const styleRoute = require("./Routes/StylesRoutes.js");
app.use("/api/styles/", styleRoute);

// Machines
const machineRoute = require("./Routes/MachineRoutes.js");
app.use("/api/machine/", machineRoute);

// Operation Bulletin
const operationBulletinRoute = require("./Routes/OperationBulletinRoutes.js");
app.use("/api/operationBulleting", operationBulletinRoute);

// Layout
const layoutRoutes = require("./Routes/LayoutRoute.js");
app.use("/api/layout", layoutRoutes);

// Workstations
const workstationRoutes = require("./Routes/Workstation.js");
app.use("/api/workstations", workstationRoutes);

// Media
const mediaRoutes = require("./Routes/HandleMediaRoute.js");
app.use("/api/media", mediaRoutes);

// Sub operation media
const subOperationRoutes = require("./Routes/SubOperationMediaRoutes.js");
app.use("/api/subOperationMedia", subOperationRoutes);

// helper operation routes
const helperOp = require("./Routes/HelperOperationRoutes.js");
app.use("/api/helperOp", helperOp);

// helper operation media
const helperOpMediaRoutes = require("./Routes/HelperMediaRoutes.js");
app.use("/api/helperOpMedia", helperOpMediaRoutes);

// Dashboard
const dashboardRoutes = require("../server/Routes/DashboardRoutes.js");
app.use("/api/dashboard", dashboardRoutes);

// needle types
const needleTypes = require("../server/Routes/NeedleTypeRoutes.js");
app.use("/api/needleType", needleTypes);

// thread routes
const threadTypes = require("../server/Routes/ThreadRoutes.js");
app.use("/api/thread", threadTypes);

const test = require("../server/Routes/TestRoutes.js");
app.use("/api/test", test);

// ==================== HEALTH CHECK ENDPOINT ====================
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    storage: {
      path: STORAGE_UNC_PATH,
      folders: ["SubOpVideos", "SubOpImages", "SubOpTechPacks", "SubOpFolders"],
    },
  });
});

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  const isProduction = process.env.NODE_ENV === "production";

  console.error({
    message: err.message,
    statusCode,
    stack: !isProduction ? err.stack : undefined,
    errors: err.errors,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  const response = {
    success: false,
    message: err.message || "Internal server error",
    ...(!isProduction && { stack: err.stack }),
  };

  if (err.field) response.field = err.field;
  if (err.errors) response.errors = err.errors;

  switch (statusCode) {
    case 401:
      response.message = response.message || "Unauthorized";
      break;
    case 403:
      response.message = response.message || "Forbidden";
      break;
    case 404:
      response.message = response.message || "Not found";
      break;
    case 422:
      response.message = response.message || "Validation failed";
      break;
  }

  return res.status(statusCode).json(response);
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log("\n📁 Static file paths configured for network storage:");
  console.log(`   📍 Base path: ${STORAGE_UNC_PATH}`);
  console.log(`   🎥 /videos → ${path.join(STORAGE_UNC_PATH, "SubOpVideos")}`);
  console.log(
    `   🖼️  /subop-images → ${path.join(STORAGE_UNC_PATH, "SubOpImages")}`,
  );
  console.log(
    `   📊 /techpacks → ${path.join(STORAGE_UNC_PATH, "SubOpTechPacks")}`,
  );
  console.log(
    `   📄 /documents → ${path.join(STORAGE_UNC_PATH, "SubOpFolders")}`,
  );
});
