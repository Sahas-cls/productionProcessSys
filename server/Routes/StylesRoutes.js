const express = require("express");
const routes = express.Router();
const styleController = require("../controllers/StyleController");
const { styleValidator } = require("../validators/StyleValidator");
const validateUser = require("../middlewares/ValidateUser");

// to get all styles
routes.get("/getStyles", styleController.getStyles);

// to create new style
routes.post(
  "/addStyle",
  styleValidator,
  validateUser,
  styleController.addStyle
);

// to edit existing style
routes.put("/editStyle/:id", styleController.editStyle);

// to delete existing style
routes.delete("/deleteStyle/:id", styleController.deleteStyle);

module.exports = routes;
