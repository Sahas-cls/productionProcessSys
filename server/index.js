const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const db = require("./models");
const multer = require("multer");
const path = require("path");
const morgan = require("morgan");

dotenv.config();

const app = express();
const upload = multer();

// Middlewares
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

// Expose shared network folder for Style Images
app.use(
  "/media",
  express.static("\\\\192.168.46.209\\Operation bullatin videos\\StyleImages", {
    setHeaders: (res, filePath) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
        ".tiff": "image/tiff",
      };
      if (mimeTypes[ext]) {
        res.setHeader("Content-Type", mimeTypes[ext]);
      }
    },
  })
);

// Expose shared network folder for Sub Operation Videos
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

// Expose shared network folder for Sub Operation Images
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

// Expose shared network folder for Tech Packs
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

// Expose shared network folder for Folder Documents
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

// // thread routes
const threadTypes = require("../server/Routes/ThreadRoutes.js");
app.use("/api/thread", threadTypes);

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

// Sync DB and start server
db.sequelize.sync({}).then(() => {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("Static file paths configured:");
    console.log("  - /media → Style Images");
    console.log("  - /videos → Sub Operation Videos");
    console.log("  - /subop-images → Sub Operation Images");
    console.log("  - /techpacks → Tech Packs");
    console.log("  - /documents → Folder Documents");
  });
});
