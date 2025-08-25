const express = require("express");
const routes = express.Router();
const styleController = require("../controllers/StyleController");
const { styleValidator } = require("../validators/StyleValidator");
const validateUser = require("../middlewares/ValidateUser");
const multer = require("multer");
const authMiddleware = require("../middlewares/AuthUser");
// const multer = require("multer");
const path = require("path");

// Configure multer for memory storage
// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "\\\\192.168.46.209\\Operation bullatin videos\\StyleImages"); // save inside /uploads
  },
  filename: function (req, file, cb) {
    const styleNo = req.body.styleNo || "unknown"; // get styleNo from form
    const poNo = req.body.poNumber || "unknown";
    const fileType = file.fieldname === "frontImage" ? "front" : "back";
    const ext = path.extname(file.originalname);

    cb(null, `${styleNo}_${poNo}_${fileType}${ext}`);
  },
});

// Multer upload middleware
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"));
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
