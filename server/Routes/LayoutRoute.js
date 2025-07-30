const express = require("express");
const routes = express.Router();
const controllers = require("../controllers/LayoutController");

// to collect sub operations that have assigned to one given layout
routes.get("/getLaSubOperations/:id", controllers.getSubOperations);

// to get layout data
routes.get("/getLayouts", controllers.getLayouts);

// to create new layout
routes.post("/create-layout", controllers.createLayout);

// to edit specific layout

// to delete specific layout

module.exports = routes;
