const express = require("express");
const routes = express.Router();
const controllers = require("../controllers/LayoutController");

// to get layout data

// to create new layout
routes.post("/create-layout", controllers.createLayout);

// to edit specific layout

// to delete specific layout

module.exports = routes;
