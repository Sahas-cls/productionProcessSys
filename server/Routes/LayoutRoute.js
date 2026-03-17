const express = require("express");
const routes = express.Router();
const controllers = require("../controllers/LayoutController");
const authMiddleware = require("../middlewares/AuthUser");

// to collect sub operations that have assigned to one given layout
routes.get("/getLaSubOperations/:id", controllers.getSubOperations);

// to get helper operations
routes.get("/getLaHelperSubOperations/:id", controllers.getHelperSubOperations);

// to get layout data
routes.get("/getLayouts", controllers.getLayouts);

// to create new layout
routes.post("/create-layout", authMiddleware, controllers.createLayout);

// to edit specific layout

// to delete specific layout
routes.delete(
  "/deleteLayout/:layoutId",
  authMiddleware,
  controllers.deleteLayout,
);

// to get 1 workstation data according to provided 
routes.get("/get-layout-data/:styleId", authMiddleware, controllers.getLayoutDetails)

module.exports = routes;
