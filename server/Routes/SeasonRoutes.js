const express = require("express");
const routes = express.Router();
const seasonController = require("../controllers/SeasonContorller");
const { seasonValidator } = require("../validators/SeasonValidator");
const validateUser = require("../middlewares/ValidateUser");
const authMiddleware = require("../middlewares/AuthUser");

//  to get all seasons
routes.get("/getSeasons", seasonController.getSeasons);

// to create new season
routes.post(
  "/createSeason",
  authMiddleware,
  seasonValidator,
  validateUser,
  seasonController.createSeason
);

// to edit season
routes.put("/editSeason/:id", authMiddleware, seasonController.exitSeason);

// to delete season
routes.delete(
  "/deleteSeason/:id",
  authMiddleware,
  seasonController.deleteSeason
);

module.exports = routes;
