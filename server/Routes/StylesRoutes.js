const express = require("express");
const routes = express.Router();
const styleController = require("../controllers/StyleController");
const { styleValidator } = require("../validators/StyleValidator");
const validateUser = require("../middlewares/ValidateUser");
const multer = require("multer");
const authMiddleware = require("../middlewares/AuthUser");
const path = require("path");

// ============================================
// IMPORTANT: Change from disk storage to memory storage
// ============================================

// Old disk storage (for UNC - REMOVE THIS):
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "\\\\192.168.46.209\\Operation bullatin videos\\StyleImages");
//   },
//   filename: function (req, file, cb) {
//     const styleNo = req.body.styleNo || "unknown";
//     const poNo = req.body.poNumber || "unknown";
//     const fileType = file.fieldname === "frontImage" ? "front" : "back";
//     const ext = path.extname(file.originalname);
//     const timestamp = new Date()
//       .toISOString()
//       .replace(/[-:T.Z]/g, "")
//       .slice(0, 14);
//     cb(null, `${styleNo}_${poNo}_${fileType}_${timestamp}${ext}`);
//   },
// });

// New memory storage (for B2):
const storage = multer.memoryStorage(); // Store files in memory as buffers

// Multer upload middleware with memory storage
const upload = multer({
  storage: storage, // Now using memoryStorage
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed (jpeg, jpg, png, gif)"));
    }
  },
});

// ============================================
// OPTIONAL: Add a middleware to handle B2-specific file naming
// ============================================

// This middleware adds a consistent filename to req.files
const processFileNames = (req, res, next) => {
  if (req.files) {
    const styleNo = req.body.styleNo || "unknown";
    const poNo = req.body.poNumber || "unknown";
    const timestamp = Date.now();

    if (req.files["frontImage"] && req.files["frontImage"][0]) {
      const file = req.files["frontImage"][0];
      const ext = path.extname(file.originalname);
      file.generatedName = `${styleNo}_${poNo}_front_${timestamp}${ext}`;
    }

    if (req.files["backImage"] && req.files["backImage"][0]) {
      const file = req.files["backImage"][0];
      const ext = path.extname(file.originalname);
      file.generatedName = `${styleNo}_${poNo}_back_${timestamp}${ext}`;
    }
  }
  next();
};
// ========= routes ==============

// to get all styles
routes.get("/getStyles", styleController.getStyles);

routes.get("/getStylesUnq", styleController.getStylesUnique);

routes.get("/getPOList/:styleId", styleController.getPOList);

routes.post("/getStylesMo", styleController.getStylesMo);

// to create new style
routes.post(
  "/addStyle",
  authMiddleware,
  upload.fields([
    { name: "frontImage", maxCount: 1 },
    { name: "backImage", maxCount: 1 },
  ]),
  processFileNames, // Optional: Add filename processing
  styleValidator,
  validateUser,
  styleController.addStyle
);

// to edit existing style
routes.put(
  "/editStyle/:id",
  authMiddleware,
  upload.fields([
    { name: "frontImage", maxCount: 1 },
    { name: "backImage", maxCount: 1 },
  ]),
  processFileNames, // Optional: Add filename processing
  styleValidator,
  validateUser,
  styleController.editStyle
);

// to generate excel file
routes.get("/getExcel", styleController.generateExcel);

// to delete existing style
routes.delete("/deleteStyle/:id", authMiddleware, styleController.deleteStyle);

module.exports = routes;
