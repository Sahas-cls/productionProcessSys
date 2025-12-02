const express = require("express");
const routes = express.Router();
const controller = require("../controllers/NeedleTypesController");
const authMiddleWare = require("../middlewares/AuthUser");
const {needleValidator} = require("../validators/NeedleTypeValidator");
const validator = require("../middlewares/ValidateUser");

// to create needle type
routes.post(
  "/createNT",
  authMiddleWare,
  controller.createNeedleType
);

// to edit needle type
routes.put("/editNT", authMiddleWare, controller.editNeedleType);

// to delete needle type
routes.delete("/deleteNT/:id", authMiddleWare, controller.deleteNeedleType);

// to get all needle types
routes.get("/getNT", authMiddleWare, controller.getNeedleTypes);

module.exports = routes;
