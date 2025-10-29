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

// Expose shared network folder as static files
app.use(
  "/media",
  express.static("\\\\192.168.46.209\\Operation bullatin videos\\StyleImages", {
    setHeaders: (res, filePath) => {
      // Allow cross-origin embedding
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

      // Set proper content-type for images
      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".jpg" || ext === ".jpeg") {
        res.setHeader("Content-Type", "image/jpeg");
      } else if (ext === ".png") {
        res.setHeader("Content-Type", "image/png");
      } else if (ext === ".gif") {
        res.setHeader("Content-Type", "image/gif");
      }
    },
  })
);

// Expose shared network folder as static video files
app.use(
  "/videos",
  express.static("\\\\192.168.46.209\\Operation bullatin videos\\SubOpVideos", {
    setHeaders: (res, filePath) => {
      res.setHeader("Access-Control-Allow-Origin", "*"); // <--- important
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".mp4") {
        res.setHeader("Content-Type", "video/mp4");
      } else if (ext === ".avi") {
        res.setHeader("Content-Type", "video/x-msvideo");
      } else if (ext === ".mov") {
        res.setHeader("Content-Type", "video/quicktime");
      } else if (ext === ".mkv") {
        res.setHeader("Content-Type", "video/x-matroska");
      } else if (ext === ".webm") {
        res.setHeader("Content-Type", "video/webm");
      }
    },
  })
);

// Routes
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

//sub operation media
const subOperationRoutes = require("./Routes/SubOperationMediaRoutes.js");
app.use("/api/subOperationMedia", subOperationRoutes);

// Error handler
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
  });
});
