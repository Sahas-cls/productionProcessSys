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

// ==================== IMPROVED VIDEO SERVING WITH MULTIPLE PATH HANDLING ====================
app.get("/videos/:videoUrl(*)", (req, res) => {
  const videoParam = req.params.videoUrl;
  console.log("video url ==== ", videoParam);
  // Log the request
  console.log(
    `🎥 Video requested: ${videoParam} at ${new Date().toISOString()}`,
  );

  // Check if filename is provided
  if (!videoParam) {
    console.log("❌ No filename provided");
    return res.status(400).json({ error: "No filename provided" });
  }

  // Security check - prevent directory traversal
  if (videoParam.includes("..")) {
    console.log("❌ Security violation - path traversal attempt:", videoParam);
    return res.status(403).json({ error: "Access denied" });
  }

  // Decode the filename (handles %20, etc.)
  const decodedParam = decodeURIComponent(videoParam);

  // Extract just the filename if it contains paths
  const filename = decodedParam.split(/[\/\\]/).pop();

  console.log(`🔍 Extracted filename: ${filename} from: ${decodedParam}`);

  // Define all possible locations to check (maintaining backward compatibility)
  const possiblePaths = [
    // Primary location - SubOpVideos folder with just filename
    path.join(STORAGE_UNC_PATH, "SubOpVideos", filename),
    // With SubOpVideos prefix in the filename (backward compatibility)
    path.join(
      STORAGE_UNC_PATH,
      "SubOpVideos",
      decodedParam.replace(/^SubOpVideos[\/\\]?/, ""),
    ),
    // Videos folder (legacy)
    path.join(STORAGE_UNC_PATH, "videos", filename),
    // Original full path as provided
    path.join(STORAGE_UNC_PATH, "SubOpVideos", decodedParam),
    path.join(STORAGE_UNC_PATH, "videos", decodedParam),
  ];

  // Remove duplicates
  const uniquePaths = [...new Set(possiblePaths)];

  console.log("🔍 Checking multiple locations:");
  let foundPath = null;
  let foundStats = null;

  for (const checkPath of uniquePaths) {
    console.log(`  Checking: ${checkPath}`);
    try {
      if (fs.existsSync(checkPath)) {
        const stats = fs.statSync(checkPath);
        if (stats.isFile()) {
          foundPath = checkPath;
          foundStats = stats;
          console.log(`  ✅ Found at: ${checkPath}`);
          break;
        }
      }
    } catch (e) {
      // Ignore errors for individual path checks
    }
  }

  // If file not found, try case-insensitive search (Windows)
  if (!foundPath && process.platform === "win32") {
    console.log("🔍 File not found, trying case-insensitive search...");

    try {
      const searchDirs = [
        path.join(STORAGE_UNC_PATH, "SubOpVideos"),
        path.join(STORAGE_UNC_PATH, "videos"),
      ];

      for (const searchDir of searchDirs) {
        if (fs.existsSync(searchDir)) {
          const files = fs.readdirSync(searchDir);
          const caseInsensitiveMatch = files.find(
            (f) => f.toLowerCase() === filename.toLowerCase(),
          );

          if (caseInsensitiveMatch) {
            const casePath = path.join(searchDir, caseInsensitiveMatch);
            const stats = fs.statSync(casePath);
            if (stats.isFile()) {
              foundPath = casePath;
              foundStats = stats;
              console.log(
                `  ✅ Found with case-insensitive match: ${casePath}`,
              );
              break;
            }
          }
        }
      }
    } catch (e) {
      console.log("Error during case-insensitive search:", e.message);
    }
  }

  // If still not found, return 404 but with a helpful message (not breaking the frontend)
  if (!foundPath || !foundStats) {
    console.log("❌ Video not found in any location");

    // For debugging - list available files (only in development)
    if (process.env.NODE_ENV !== "production") {
      try {
        const videoDir = path.join(STORAGE_UNC_PATH, "SubOpVideos");
        if (fs.existsSync(videoDir)) {
          const files = fs.readdirSync(videoDir).slice(0, 10);
          console.log("📁 Available videos (first 10):", files);
        }
      } catch (e) {
        console.log("Could not read directory:", e.message);
      }
    }

    // Instead of returning JSON, return a 404 but let the video element handle it
    // This prevents frontend errors from breaking the UI
    res
      .status(404)
      .sendFile(
        path.join(__dirname, "public", "video-not-found.mp4"),
        (err) => {
          if (err) {
            // If placeholder doesn't exist, just send 404
            res.status(404).end();
          }
        },
      );
    return;
  }

  // File found - stream it
  try {
    console.log("📊 File stats:", {
      size: foundStats.size,
      isFile: foundStats.isFile(),
      modified: foundStats.mtime,
      path: foundPath,
    });

    // Set proper headers for video streaming
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", foundStats.size);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Range, Accept-Ranges",
    );
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Handle range requests (for seeking in video)
    const range = req.headers.range;

    if (range) {
      console.log("📊 Range request:", range);

      // Parse range header
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : foundStats.size - 1;

      // Validate range
      if (start >= foundStats.size || end >= foundStats.size) {
        console.log("❌ Invalid range:", {
          start,
          end,
          fileSize: foundStats.size,
        });
        res
          .status(416)
          .setHeader("Content-Range", `bytes */${foundStats.size}`)
          .end();
        return;
      }

      const chunksize = end - start + 1;

      // Set partial content headers
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${foundStats.size}`,
        "Content-Length": chunksize,
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
      });

      // Create read stream for the requested range
      const stream = fs.createReadStream(foundPath, { start, end });

      // Handle stream events
      stream.on("error", (err) => {
        console.error("❌ Stream error:", err);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });

      stream.on("end", () => {
        console.log("✅ Range stream completed");
      });

      // Pipe the stream to response
      stream.pipe(res);
    } else {
      // Full file request
      console.log("📊 Full file request");

      // Create read stream for entire file
      const stream = fs.createReadStream(foundPath);

      // Handle stream events
      stream.on("error", (err) => {
        console.error("❌ Stream error:", err);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });

      stream.on("end", () => {
        console.log("✅ Full file stream completed");
      });

      stream.on("open", () => {
        console.log("✅ Stream opened successfully");
      });

      // Pipe the stream to response
      stream.pipe(res);
    }
  } catch (error) {
    console.error("❌ Error accessing video:", error);

    // Handle specific errors gracefully
    if (error.code === "ENOENT") {
      res.status(404).end();
    } else if (error.code === "EACCES") {
      res.status(403).end();
    } else {
      res.status(500).end();
    }
  }
});

// Create a placeholder video for 404s (optional)
const publicDir = path.join(__dirname, "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

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
    fallthrough: true, // Allow falling through to next middleware if file not found
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
    fallthrough: true,
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
    fallthrough: true,
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
    try {
      const stats = fs.statSync(subOpVideosPath);
      result.locations.subOpVideos.stats = {
        size: stats.size,
        isFile: stats.isFile(),
        modified: stats.mtime,
      };
    } catch (e) {
      result.locations.subOpVideos.error = e.message;
    }
  }

  if (result.locations.videos.exists) {
    try {
      const stats = fs.statSync(videosPath);
      result.locations.videos.stats = {
        size: stats.size,
        isFile: stats.isFile(),
        modified: stats.mtime,
      };
    } catch (e) {
      result.locations.videos.error = e.message;
    }
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
      // For video files, we've already handled them above
      // For other static files, they should be handled by express.static
      return res.status(404).end();
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

  // Don't send error details for video requests
  if (req.path.startsWith("/videos/")) {
    return res.status(statusCode).end();
  }

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
  console.log(
    `   🎥 /videos → ${path.join(STORAGE_UNC_PATH, "SubOpVideos")} (with fallback to /videos folder)`,
  );
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
