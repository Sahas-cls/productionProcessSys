const express = require("express");
const routes = express.Router();
const styleController = require("../controllers/StyleController");
const { styleValidator } = require("../validators/StyleValidator");
const validateUser = require("../middlewares/ValidateUser");
const multer = require("multer");
const upload = multer();

// to get all styles
routes.get("/getStyles", styleController.getStyles);

// to create new style
routes.post(
  "/addStyle",
  upload.any(),
  styleValidator,
  validateUser,
  styleController.addStyle
);

// to edit existing style
routes.put(
  "/editStyle/:id",
  upload.any(),
  styleValidator,
  validateUser,
  styleController.editStyle
);

// to generate excel file
routes.get("/getExcel", styleController.generateExcel);

// to delete existing style
routes.delete("/deleteStyle/:id", styleController.deleteStyle);

module.exports = routes;
