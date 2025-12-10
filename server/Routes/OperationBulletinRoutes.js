const express = require("express");
const routes = express.Router();
const controller = require("../controllers/OperationBuletinController");
const authMiddleware = require("../middlewares/AuthUser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "./uploads";
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "excel-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// multer error handler
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [".xlsx", ".xls"];
  const allowedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];

  const fileExtension = path.extname(file.originalname).toLowerCase();
  const isValidExtension = allowedExtensions.includes(fileExtension);
  const isValidMimeType = allowedMimeTypes.includes(file.mimetype);

  if (isValidExtension && isValidMimeType) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Please upload Excel files only (${allowedExtensions.join(
          ", "
        )})`
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});
// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File too large. Maximum size is 10MB.",
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${error.message}`,
    });
  } else if (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
  next();
};

// to fetch all operation list and helper operation list
routes.get("/getAllOB", controller.getBOList);

// to get operations and sub operations for specific style + po =
routes.get("/getOB/:styleId", controller.getSBO);

// to edit main operation data
routes.put(
  "/edit-main-operation/:id",
  authMiddleware,
  controller.editMainOperation
);

// to create new operation bulletin
routes.post("/createOB", authMiddleware, controller.createBulkOperations);

// to create main operation for specific style
routes.post(
  "/create/main-operation",
  authMiddleware,
  controller.createMainOperation
);

// to create sub operation for specific main operation
routes.post("/create/sub-operation", authMiddleware, controller.createSubOp);

// to edit specific sub operation
routes.put(
  "/edit-sub-operation/:id",
  authMiddleware,
  controller.updateSubOperation
);

// to delete specific sub operation with it's needle layout
routes.delete(
  "/delete-sub-operation/:id",
  authMiddleware,
  controller.deleteSubOperation
);

// to create new helper operation
routes.post("/createHelperOps", authMiddleware, controller.createHelperOps);

// to delete operation
routes.delete("/deleteBO/:id", authMiddleware, controller.deleteOperation);

// ================================ to handle excel file

routes.post(
  "/uploadExcel",
  upload.single("excelFile"),
  handleMulterError,
  controller.processExcel
);

// to insert provided data to db
routes.post(
  "/saveOperations/:styleId",
  authMiddleware,
  controller.saveOperations
);

module.exports = routes;
