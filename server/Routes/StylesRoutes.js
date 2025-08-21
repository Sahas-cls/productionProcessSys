const express = require("express");
const routes = express.Router();
const styleController = require("../controllers/StyleController");
const { styleValidator } = require("../validators/StyleValidator");
const validateUser = require("../middlewares/ValidateUser");
const multer = require("multer");
const authMiddleware = require("../middlewares/AuthUser");

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

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
  styleValidator,
  validateUser,
  styleController.editStyle
);

// to generate excel file
routes.get("/getExcel", styleController.generateExcel);

// to delete existing style
routes.delete("/deleteStyle/:id", authMiddleware, styleController.deleteStyle);

module.exports = routes;
