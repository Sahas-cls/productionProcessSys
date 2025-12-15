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

// to get season wise styles
// Season-wise styles data for charts
routes.get("/season-wise-styles", controller.getSeasonWiseStyles);

// Styles by specific season
routes.get("/season/:season_id", controller.getStylesBySeason);

// Seasonal trends
routes.get("/seasonal-trends", controller.getSeasonalTrends);

// Customer season distribution
routes.get(
  "/customer-season-distribution",
  controller.getCustomerSeasonDistribution
);

module.exports = routes;
