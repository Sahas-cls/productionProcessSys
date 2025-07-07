const { Season, Customer } = require("../models");

// to get all seasons
exports.getSeasons = async (req, res, next) => {
  //   console.log(req.body);
  try {
    const seasons = await Season.findAll({
      include: [
        {
          model: Customer,
          as: "customer",
          requried: true,
        },
      ],
    });
    // console.log(seasons);
    if (seasons) {
      res.status(200).json({ status: "success", data: seasons });
    }
  } catch (error) {
    return next(error);
  }
};

// to create new season set M:1
exports.createSeason = async (req, res, next) => {
  console.log(req.body);
  //   return;
  try {
    const { customerId, seasons } = req.body;

    // Ensure customerId is an integer and seasons is a valid array
    if (!customerId || !Array.isArray(seasons) || seasons.length === 0) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    // Create multiple season records
    const seasonRecords = seasons.map((seasonName) => ({
      season: seasonName.trim(), // assuming column name is `season_name`
      customer_id: customerId,
    }));

    const result = await Season.bulkCreate(seasonRecords);

    return res.status(201).json({
      message: "Seasons created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error creating seasons:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

// to edit existing season
exports.exitSeason = async (req, res, next) => {
  console.log(req.body);
  const { customerId, season, seasonId } = req.body;
  console.log(seasonId);
  try {
    const crrSeason = await Season.findByPk(seasonId);
    if (!crrSeason) {
      const error = new Error("Season cannot be find in the database");
      error.status(404);
      return next(error);
    }

    await crrSeason.update({ season: season });
    res
      .status(200)
      .json({ status: "success", message: "season update success" });
  } catch (error) {
    return next(error);
  }
};

//  to delete existing season
exports.deleteSeason = async (req, res, next) => {
  console.log(req.params);
  const seasonId = req.params.id;
  console.log(seasonId);
  try {
    const season = await Season.findByPk(seasonId);
    if (!season) {
      const error = new Error("Season cannot be find in the database");
      error.status(404);
      return next(error);
    }

    await season.destroy();
    res
      .status(200)
      .json({ status: "success", message: "Season delete success" });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};
