const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const db = require("./models");
const multer = require("multer");
const path = require("path");
const morgan = require("morgan");
const AWS = require("aws-sdk");
const axios = require("axios");

// ==================== CRITICAL: Load environment variables FIRST ====================
require("dotenv").config();

// Debug: Check if environment variables are loaded
console.log("🔍 Environment Variables Check:");
console.log("B2_KEY_ID exists:", !!process.env.B2_KEY_ID);
console.log("B2_APP_KEY exists:", !!process.env.B2_APP_KEY);
console.log("B2_BUCKET_NAME:", process.env.B2_BUCKET_NAME || "not set");

// Don't log full keys for security, just show first few chars
if (process.env.B2_KEY_ID) {
  console.log(
    "B2_KEY_ID (first 10 chars):",
    process.env.B2_KEY_ID.substring(0, 10) + "..."
  );
}
if (process.env.B2_APP_KEY) {
  console.log(
    "B2_APP_KEY (first 10 chars):",
    process.env.B2_APP_KEY.substring(0, 10) + "..."
  );
}

// ==================== Initialize AWS S3 for Backblaze B2 ====================
// IMPORTANT: This must come AFTER dotenv.config()
const s3 = new AWS.S3({
  endpoint: "https://s3.eu-central-003.backblazeb2.com",
  region: "eu-central-003",
  credentials: {
    accessKeyId: process.env.B2_KEY_ID || "",
    secretAccessKey: process.env.B2_APP_KEY || "",
  },
  s3ForcePathStyle: true,
  // Add timeout settings
  httpOptions: {
    timeout: 30000, // 30 seconds
    connectTimeout: 10000, // 10 seconds
  },
});

const app = express();
const upload = multer();

// ==================== MIDDLEWARES ====================
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

// ==================== STATIC FILE SERVING ====================

// NOTE: The /media route is now handled by B2 proxy below
// Old UNC path commented out:
// app.use(
//   "/media",
//   express.static("\\\\192.168.46.209\\Operation bullatin videos\\StyleImages", {
//     // ... headers
//   })
// );

// Keep other UNC routes for videos, subop-images, etc.
app.use(
  "/videos",
  express.static("\\\\192.168.46.209\\Operation bullatin videos\\SubOpVideos", {
    setHeaders: (res, filePath) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

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
      };
      if (mimeTypes[ext]) {
        res.setHeader("Content-Type", mimeTypes[ext]);
      }
    },
  })
);

app.use(
  "/subop-images",
  express.static("\\\\192.168.46.209\\Operation bullatin videos\\SubOpImages", {
    setHeaders: (res, filePath) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".bmp": "image/bmp",
        ".tiff": "image/tiff",
      };
      if (mimeTypes[ext]) {
        res.setHeader("Content-Type", mimeTypes[ext]);
      }
    },
  })
);

app.use(
  "/techpacks",
  express.static(
    "\\\\192.168.46.209\\Operation bullatin videos\\SubOpTechPacks",
    {
      setHeaders: (res, filePath) => {
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Cross-Origin-Embedder-Policy", "cross-origin");
        res.setHeader("Access-Control-Allow-Origin", "*");

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
        };
        if (mimeTypes[ext]) {
          res.setHeader("Content-Type", mimeTypes[ext]);
        } else {
          // Default to octet-stream for unknown types
          res.setHeader("Content-Type", "application/octet-stream");
        }

        // Set download headers for certain file types
        if (
          [".xls", ".xlsx", ".csv", ".ods", ".pdf", ".doc", ".docx"].includes(
            ext
          )
        ) {
          res.setHeader("Content-Disposition", "inline");
        }
      },
    }
  )
);

app.use(
  "/documents",
  express.static(
    "\\\\192.168.46.209\\Operation bullatin videos\\SubOpFolders",
    {
      setHeaders: (res, filePath) => {
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Cross-Origin-Embedder-Policy", "cross-origin");
        res.setHeader("Access-Control-Allow-Origin", "*");

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

          // Archives
          ".zip": "application/zip",
          ".rar": "application/x-rar-compressed",
        };
        if (mimeTypes[ext]) {
          res.setHeader("Content-Type", mimeTypes[ext]);
        } else {
          // Default to octet-stream for unknown types
          res.setHeader("Content-Type", "application/octet-stream");
        }

        // Set appropriate disposition
        if ([".pdf", ".doc", ".docx", ".xls", ".xlsx"].includes(ext)) {
          res.setHeader("Content-Disposition", "inline");
        }
      },
    }
  )
);

// ==================== ROUTES ====================

// CSRF Token
app.get("/api/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

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

// Dashboard
const dashboardRoutes = require("../server/Routes/DashboardRoutes.js");
app.use("/api/dashboard", dashboardRoutes);

// needle types
const needleTypes = require("../server/Routes/NeedleTypeRoutes.js");
app.use("/api/needleType", needleTypes);

// thread routes
const threadTypes = require("../server/Routes/ThreadRoutes.js");
app.use("/api/thread", threadTypes);

// ==================== B2 PROXY ROUTE ====================
// This replaces the old /media UNC path
// Fixed backend route for video streaming with proper progressive playback support
app.get("/api/b2-files/*", async (req, res) => {
  try {
    const filePath = req.params[0];
    console.log("📁 [B2 Proxy] Requested file:", filePath);

    if (!filePath) {
      return res.status(400).json({ error: "No file specified" });
    }

    const params = {
      Bucket: process.env.B2_BUCKET_NAME || "guston-test-bucket",
      Key: filePath,
    };

    console.log("🔑 [B2 Proxy] Fetching:", params.Key);

    // Set CORS headers first
    const corsHeaders = {
      "Access-Control-Allow-Origin":
        req.headers.origin || "http://localhost:5173",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Expose-Headers":
        "Content-Range, Accept-Ranges, Content-Length, Content-Type",
      "Cache-Control": "public, max-age=31536000",
    };

    // Handle OPTIONS preflight immediately
    if (req.method === "OPTIONS") {
      res.set(corsHeaders);
      return res.status(200).end();
    }

    try {
      // Get file metadata
      const headResult = await s3.headObject(params).promise();
      const fileSize = headResult.ContentLength;

      // IMPORTANT: Override Content-Type based on file extension for video files
      // B2 sometimes returns application/octet-stream which breaks video playback
      const fileExtension = path.extname(filePath).toLowerCase();
      let contentType = headResult.ContentType;

      // Force correct Content-Type for known video formats
      if (fileExtension === ".webm") {
        contentType = "video/webm";
      } else if (fileExtension === ".mp4") {
        contentType = "video/mp4";
      } else if (fileExtension === ".mov") {
        contentType = "video/quicktime";
      } else if (fileExtension === ".avi") {
        contentType = "video/x-msvideo";
      }

      // If still not set, use extension-based detection
      if (!contentType || contentType === "application/octet-stream") {
        contentType = getContentTypeFromExtension(filePath);
      }

      const isVideo = isVideoExtension(filePath);

      console.log(
        `📊 [B2 Proxy] File found: ${fileSize} bytes, Type: ${contentType}, Video: ${isVideo}`
      );

      // Always set Accept-Ranges for video files
      if (isVideo) {
        corsHeaders["Accept-Ranges"] = "bytes";
      }

      // Handle Range request (for video seeking)
      const range = req.headers.range;

      if (isVideo && range) {
        console.log(`🎯 [B2 Proxy] Range requested: ${range}`);

        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        // Validate range
        if (start >= fileSize || end >= fileSize) {
          res.set({
            ...corsHeaders,
            "Content-Range": `bytes */${fileSize}`,
          });
          return res.status(416).send("Requested range not satisfiable");
        }

        const chunkSize = end - start + 1;

        console.log(
          `🎯 [B2 Proxy] Streaming bytes ${start}-${end} of ${fileSize}`
        );

        // Stream specific range
        const streamParams = {
          ...params,
          Range: `bytes=${start}-${end}`,
        };

        const headers = {
          ...corsHeaders,
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Content-Length": chunkSize,
          "Content-Type": contentType,
        };

        res.writeHead(206, headers);

        // Stream with error handling
        const stream = s3.getObject(streamParams).createReadStream();

        stream.on("error", (streamError) => {
          console.error("❌ [B2 Proxy] Stream error:", streamError.message);
          if (!res.headersSent) {
            res.set(corsHeaders);
            res
              .status(500)
              .json({ error: "Stream error", message: streamError.message });
          }
        });

        stream.pipe(res);
      } else {
        // Full file request (initial load or non-video)
        console.log(`📦 [B2 Proxy] Streaming full file (${fileSize} bytes)`);

        const headers = {
          ...corsHeaders,
          "Content-Length": fileSize,
          "Content-Type": contentType,
        };

        if (isVideo) {
          headers["Accept-Ranges"] = "bytes";
        }

        res.writeHead(200, headers);

        const stream = s3.getObject(params).createReadStream();

        stream.on("error", (streamError) => {
          console.error("❌ [B2 Proxy] Stream error:", streamError.message);
          if (!res.headersSent) {
            res.set(corsHeaders);
            res
              .status(500)
              .json({ error: "Stream error", message: streamError.message });
          }
        });

        stream.pipe(res);
      }
    } catch (headError) {
      console.error("❌ [B2 Proxy] File not found:", headError.message);

      res.set(corsHeaders);
      return res.status(404).json({
        error: "File not found",
        requested: filePath,
      });
    }
  } catch (error) {
    console.error("❌ [B2 Proxy] Unexpected error:", error.message);

    res.set({
      "Access-Control-Allow-Origin":
        req.headers.origin || "http://localhost:5173",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Credentials": "true",
      "Content-Type": "application/json",
    });

    return res.status(500).json({
      error: "Failed to stream file",
      message: error.message,
    });
  }
});

// Add OPTIONS method for CORS preflight requests
app.options("/api/b2-files/*", (req, res) => {
  res.set({
    "Access-Control-Allow-Origin":
      req.headers.origin || "http://localhost:5173",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400", // 24 hours
  });
  res.status(204).end();
});

// Helper functions to detect file types
function isVideoExtension(filePath) {
  const videoExtensions = [
    ".mp4",
    ".webm",
    ".ogg",
    ".mov",
    ".avi",
    ".mkv",
    ".flv",
    ".wmv",
  ];
  const ext = path.extname(filePath).toLowerCase();
  return videoExtensions.includes(ext);
}

function isImageExtension(filePath) {
  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".webp",
    ".svg",
  ];
  const ext = path.extname(filePath).toLowerCase();
  return imageExtensions.includes(ext);
}

function getContentTypeFromExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  const mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".ogg": "video/ogg",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".zip": "application/zip",
    ".txt": "text/plain",
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
  };

  return mimeTypes[ext] || "application/octet-stream";
}

app.get("/api/b2-test", async (req, res) => {
  try {
    console.log("🧪 Testing B2 connectivity...");

    // Check credentials
    if (!process.env.B2_KEY_ID || !process.env.B2_APP_KEY) {
      return res.status(500).json({
        status: "error",
        message: "Missing B2 credentials in .env",
        B2_KEY_ID: !!process.env.B2_KEY_ID,
        B2_APP_KEY: !!process.env.B2_APP_KEY,
        B2_BUCKET_NAME: process.env.B2_BUCKET_NAME || "not set",
      });
    }

    // Try to list buckets (simple API call)
    // const buckets = await s3.listBuckets().promise();

    // Try to list files in our bucket
    let bucketContents = [];
    if (process.env.B2_BUCKET_NAME) {
      try {
        const files = await s3
          .listObjectsV2({
            Bucket: process.env.B2_BUCKET_NAME,
            MaxKeys: 10,
            Prefix: "StyleImages/",
          })
          .promise();
        bucketContents = files.Contents || [];
      } catch (bucketError) {
        console.log(
          "Note: Could not list bucket contents:",
          bucketError.message
        );
      }
    }

    res.json({
      status: "success",
      message: "B2 connection successful",
      credentials: {
        hasKeyId: !!process.env.B2_KEY_ID,
        hasAppKey: !!process.env.B2_APP_KEY,
        bucketName: process.env.B2_BUCKET_NAME,
      },
      buckets: buckets.Buckets.map((b) => b.Name),
      filesInStyleImages: bucketContents.map((f) => ({
        key: f.Key,
        size: f.Size,
        lastModified: f.LastModified,
      })),
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "B2 connection failed",
      error: error.message,
      code: error.code,
      suggestion: "Check .env file and B2 credentials",
    });
  }
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

  if (err.field) {
    response.field = err.field;
  }

  if (err.errors) {
    response.errors = err.errors;
    if (!err.message) {
      response.message = "Validation failed";
    }
  }

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

db.sequelize.sync({}).then(() => {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log("📁 Static file paths configured:");
    // console.log("  - /videos → Sub Operation Videos (UNC)");
    // console.log("  - /subop-images → Sub Operation Images (UNC)");
    // console.log("  - /techpacks → Tech Packs (UNC)");
    // console.log("  - /documents → Folder Documents (UNC)");
    // console.log("📤 B2 Proxy routes:");
    // console.log(`  - /api/b2-files/* → Backblaze B2 Style Images`);
    // console.log(`  - /api/b2-test → B2 connectivity test`);
    // console.log("\n🔍 First, test B2 connection:");
    // console.log(`   http://localhost:${PORT}/api/b2-test`);
    // console.log("\n📸 Then test an image:");
    // console.log(
    //   `   http://localhost:${PORT}/api/b2-files/StyleImages/Test-Style-004_front_1764654222622.jpg`
    // );
  });
});
