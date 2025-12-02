const express = require("express");
const routes = express.Router();
const controller = require("../controllers/DashboardController");

// to filter styles and provide them to live search
routes.get("/getStyles/:searchTerm", controller.getStyles);

// to filter styles and provide them to live search
routes.get("/getStyles", controller.getAllStyles);

// to count customers, machines and styles
routes.get("/countBase", controller.countBase);

// to count features, operations, videos, images, tech packs, folders
routes.get("/countSub", controller.countSub);

// to count features, operations, videos, images, tech packs, folders
routes.get("/countSub/:selectedStyle", controller.countFilterSub);

module.exports = routes;
