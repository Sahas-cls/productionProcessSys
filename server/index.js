const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const db = require("./models");
const multer = require("multer");
const path = require("path");
const morgan = require("morgan");
const fs = require("fs");

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

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

// ==================== STATIC FILE SERVING FOR NETWORK STORAGE ====================

// Define the base path for the storage location
const STORAGE_UNC_PATH =
  process.platform === "win32" ? "Y:\\" : "/mnt/bulletin-assets";

// Debug logging middleware for all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ==================== VIDEO SERVING WITH PROPER HANDLING ====================
app.get("/videos/*", (req, res) => {
  // Get the filename from the URL path
  const videoPath = req.params[0] || req.path.replace("/videos/", "");

  console.log("🎥 Video requested:", {
    originalPath: req.path,
    videoPath: videoPath,
    method: req.method,
  });

  // Security check - prevent directory traversal
  if (
    videoPath.includes("..") ||
    videoPath.includes("\\") ||
    videoPath.includes("//")
  ) {
    console.log("❌ Security violation - path traversal attempt:", videoPath);
    return res.status(403).json({ error: "Access denied" });
  }

  // Decode the filename (handles %20, etc.)
  const decodedFilename = decodeURIComponent(videoPath);

  // Try both possible locations (videos and SubOpVideos)
  const possiblePaths = [
    path.join(STORAGE_UNC_PATH, "SubOpVideos", decodedFilename),
    path.join(STORAGE_UNC_PATH, "videos", decodedFilename),
  ];

  console.log("🔍 Looking for video in locations:");
  let foundPath = null;

  for (const checkPath of possiblePaths) {
    console.log("  Checking:", checkPath);
    if (fs.existsSync(checkPath)) {
      foundPath = checkPath;
      console.log("  ✅ Found at:", checkPath);
      break;
    }
  }

  // If file not found in either location
  if (!foundPath) {
    console.log("❌ Video not found in any location");

    // List directory contents for debugging
    try {
      const subOpVideosDir = path.join(STORAGE_UNC_PATH, "SubOpVideos");
      if (fs.existsSync(subOpVideosDir)) {
        const files = fs.readdirSync(subOpVideosDir).slice(0, 10);
        console.log("📁 SubOpVideos contains:", files);
      }
    } catch (e) {
      console.log("Could not read directory:", e.message);
    }

    return res.status(404).json({
      error: "Video not found",
      requested: decodedFilename,
    });
  }

  // Get file stats
  try {
    const stat = fs.statSync(foundPath);
    console.log("📊 File stats:", {
      size: stat.size,
      isFile: stat.isFile(),
      modified: stat.mtime,
    });

    // Set proper headers for video streaming
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", "public, max-age=86400");

    // Handle range requests (for seeking in video)
    const range = req.headers.range;

    if (range) {
      console.log("📊 Range request:", range);
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = end - start + 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Content-Length": chunksize,
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
      });

      const stream = fs.createReadStream(foundPath, { start, end });
      stream.pipe(res);

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming video" });
        }
      });
    } else {
      console.log("📊 Full file request");
      const stream = fs.createReadStream(foundPath);
      stream.pipe(res);

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming video" });
        }
      });
    }
  } catch (error) {
    console.error("❌ Error accessing video:", error);
    res.status(500).json({ error: "Error accessing video file" });
  }
});

// ==================== OTHER STATIC ROUTES ====================
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
    },
  }),
);

// ==================== API ROUTES ====================
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
const dashboardRoutes = require("./Routes/DashboardRoutes.js");
app.use("/api/dashboard", dashboardRoutes);

// needle types
const needleTypes = require("./Routes/NeedleTypeRoutes.js");
app.use("/api/needleType", needleTypes);

// thread routes
const threadTypes = require("./Routes/ThreadRoutes.js");
app.use("/api/thread", threadTypes);

const test = require("./Routes/TestRoutes.js");
app.use("/api/test", test);

// ==================== HEALTH CHECK ENDPOINT ====================
app.get("/api/health", (req, res) => {
  const subOpVideosPath = path.join(STORAGE_UNC_PATH, "SubOpVideos");
  const videosExist = fs.existsSync(subOpVideosPath);
  let videoCount = 0;

  if (videosExist) {
    try {
      videoCount = fs.readdirSync(subOpVideosPath).length;
    } catch (e) {
      console.log("Error reading videos directory:", e.message);
    }
  }

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    storage: {
      path: STORAGE_UNC_PATH,
      subOpVideosExists: videosExist,
      videoCount: videoCount,
      folders: ["SubOpVideos", "SubOpImages", "SubOpTechPacks", "SubOpFolders"],
    },
  });
});

// ==================== DEBUG ENDPOINT ====================
app.get("/api/debug/video/:filename(*)", (req, res) => {
  const filename = req.params[0];
  const decodedFilename = decodeURIComponent(filename);

  const subOpVideosPath = path.join(
    STORAGE_UNC_PATH,
    "SubOpVideos",
    decodedFilename,
  );
  const videosPath = path.join(STORAGE_UNC_PATH, "videos", decodedFilename);

  const result = {
    requested: filename,
    decoded: decodedFilename,
    storagePath: STORAGE_UNC_PATH,
    locations: {
      subOpVideos: {
        path: subOpVideosPath,
        exists: fs.existsSync(subOpVideosPath),
      },
      videos: {
        path: videosPath,
        exists: fs.existsSync(videosPath),
      },
    },
  };

  // Add stats if file exists
  if (result.locations.subOpVideos.exists) {
    const stats = fs.statSync(subOpVideosPath);
    result.locations.subOpVideos.stats = {
      size: stats.size,
      isFile: stats.isFile(),
      modified: stats.mtime,
    };
  }

  if (result.locations.videos.exists) {
    const stats = fs.statSync(videosPath);
    result.locations.videos.stats = {
      size: stats.size,
      isFile: stats.isFile(),
      modified: stats.mtime,
    };
  }

  // List directory contents
  try {
    const subOpVideosDir = path.join(STORAGE_UNC_PATH, "SubOpVideos");
    if (fs.existsSync(subOpVideosDir)) {
      result.directoryContents = fs.readdirSync(subOpVideosDir).slice(0, 20);
    }
  } catch (e) {
    result.directoryError = e.message;
  }

  res.json(result);
});

// ==================== SERVE REACT APP (MUST BE LAST) ====================
// Serve static files from React build
const reactBuildPath = path.join(__dirname, "..", "frontend", "dist");
if (fs.existsSync(reactBuildPath)) {
  console.log("📁 Serving React app from:", reactBuildPath);
  app.use(express.static(reactBuildPath));

  // Catch-all route for React SPA - this must be LAST
  app.get("*", (req, res) => {
    // Don't serve index.html for API routes or file requests
    if (
      req.url.startsWith("/api/") ||
      req.url.startsWith("/videos/") ||
      req.url.startsWith("/subop-images/") ||
      req.url.startsWith("/techpacks/") ||
      req.url.startsWith("/documents/")
    ) {
      return res.status(404).json({ error: "Not found" });
    }
    res.sendFile(path.join(reactBuildPath, "index.html"));
  });
} else {
  console.log("⚠️ React build not found at:", reactBuildPath);
}

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  const isProduction = process.env.NODE_ENV === "production";

  console.error({
    message: err.message,
    statusCode,
    stack: !isProduction ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    ...(!isProduction && { stack: err.stack }),
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log("\n" + "=".repeat(50));
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log("=".repeat(50));
  console.log("\n📁 Static file paths:");
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

  // Check if video directory exists
  const videoDir = path.join(STORAGE_UNC_PATH, "SubOpVideos");
  if (fs.existsSync(videoDir)) {
    try {
      const files = fs.readdirSync(videoDir);
      console.log(`\n🎬 Video directory contains ${files.length} files`);
      if (files.length > 0) {
        console.log("   Sample files:", files.slice(0, 3));
      }
    } catch (e) {
      console.log("⚠️ Could not read video directory:", e.message);
    }
  } else {
    console.log(`\n⚠️ Video directory does not exist: ${videoDir}`);
  }
  console.log("=".repeat(50) + "\n");
});
