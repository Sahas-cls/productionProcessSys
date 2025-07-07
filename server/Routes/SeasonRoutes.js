const express = require("express");
const routes = express.Router();
const seasonController = require("../controllers/SeasonContorller");
const { seasonValidator } = require("../validators/SeasonValidator");
const validateUser = require("../middlewares/ValidateUser");

//  to get all seasons
routes.get("/getSeasons", seasonController.getSeasons);

// to create new season
routes.post(
  "/createSeason",
  seasonValidator,
  validateUser,
  seasonController.createSeason
);

// to edit season
routes.put("/editSeason/:id", seasonController.exitSeason);

// to delete season
routes.delete("/deleteSeason/:id", seasonController.deleteSeason);

module.exports = routes;
