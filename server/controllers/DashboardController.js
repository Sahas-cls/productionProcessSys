const {
  Layout,
  Workstation,
  sequelize,
  MainOperation,
  SubOperation,
  Style,
  Machine,
  Customer,
  SubOperationMedia,
  SubOperationImages,
  SubOperationTechPack,
  SubOperationFolder,
} = require("../models");

const { Season, Factory } = require("../models");
const { Op, where } = require("sequelize");

exports.getAllStyles = async (req, res, next) => {
  try {
    const styles = await Style.findAll({
      attributes: ["style_no"],
      raw: true,
    });

    return res.status(200).json({
      success: true,
      styles: styles,
    });
  } catch (error) {
    console.error("Error fetching styles:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch styles",
    });
  }
};

exports.getStyles = async (req, res, next) => {
  try {
    const { searchTerm } = req.params;

    let styles = await Style.findAll({
      where:
        searchTerm && searchTerm !== "all"
          ? {
              style_no: {
                [Op.like]: `%${searchTerm}%`,
              },
            }
          : undefined,
      limit: 20, // Add limit for performance
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      styles: styles,
      count: styles.length,
    });
  } catch (err) {
    console.error("Error in getStyles:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.countBase = async (req, res, next) => {
  try {
    const customerCount = await Customer.count();
    const machineCount = await Machine.count();
    const styles = await Style.count();

    res.status(200).json({
      customerCount,
      machineCount,
      styles,
    });
  } catch (error) {
    console.error("Error while counting base items: ", error);
    next(error);
  }
};

exports.countSub = async (req, res, next) => {
  try {
    const mainOp = await MainOperation.count();
    const subOp = await SubOperation.count();
    const videos = await SubOperationMedia.count();
    const images = await SubOperationImages.count();
    const techPacks = await SubOperationTechPack.count();
    const folders = await SubOperationFolder.count();

    res.status(200).json({ mainOp, subOp, videos, images, techPacks, folders });
  } catch (error) {
    console.error("Error while counting base items: ", error);
    next(error);
  }
};

exports.countFilterSub = async (req, res, next) => {
  const { selectedStyle } = req.params;

  try {
    // 1️⃣ Find the style
    const style = await Style.findOne({ where: { style_no: selectedStyle } });
    if (!style) {
      const error = new Error("Can't find that style in database");
      error.status = 404;
      throw error;
    }

    // 2️⃣ Get all main operations for that style
    const mainOperations = await MainOperation.findAll({
      where: { style_no: style.style_id }, // style_no is the FK in MainOperation
      attributes: ["operation_id"],
      raw: true,
    });

    const mainOpIds = mainOperations.map((op) => op.operation_id);

    // 3️⃣ Get all sub-operations for those main operations
    const subOperations = await SubOperation.findAll({
      where: { main_operation_id: mainOpIds },
      attributes: ["sub_operation_id"],
      raw: true,
    });

    const subOpIds = subOperations.map((sub) => sub.sub_operation_id);
    const subOpCount = subOpIds.length;

    // 4️⃣ Count related items
    const videos = await SubOperationMedia.count({
      where: { sub_operation_id: subOpIds },
    });

    const images = await SubOperationImages.count({
      where: { sub_operation_id: subOpIds },
    });

    const techPacks = await SubOperationTechPack.count({
      where: { sub_operation_id: subOpIds },
    });

    const folders = await SubOperationFolder.count({
      where: { sub_operation_id: subOpIds },
    });

    // 5️⃣ Send response
    res.status(200).json({
      mainOp: mainOpIds.length,
      subOp: subOpCount,
      videos,
      images,
      techPacks,
      folders,
    });
  } catch (error) {
    console.error("Error while counting sub items:", error);
    next(error);
  }
};

// controllers/dashboardController.js

/**
 * Get season-wise styles grouped by season
 */
exports.getSeasonWiseStyles = async (req, res) => {
  try {
    const seasons = await Season.findAll({
      attributes: [
        "season_id",
        "season",
        "customer_id",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: Style,
          as: "seasons",
          attributes: ["style_id", "style_no", "style_name", "createdAt"],
          required: false,
        },
        {
          model: Customer,
          as: "customer",
          attributes: ["customer_id", "customer_name"],
        },
      ],
      order: [
        ["season", "ASC"],
        [{ model: Style, as: "seasons" }, "createdAt", "DESC"],
      ],
    });

    // Group data by season name (combine seasons with same name)
    const seasonMap = new Map();

    seasons.forEach((season) => {
      const seasonName = season.season;
      const styles = season.seasons || [];

      if (seasonMap.has(seasonName)) {
        // If season name already exists, merge the data
        const existing = seasonMap.get(seasonName);
        existing.total_styles += styles.length;
        existing.styles = [...existing.styles, ...styles.map((style) => ({
          style_id: style.style_id,
          style_no: style.style_no,
          style_name: style.style_name,
          created_at: style.createdAt,
        }))];
        // Keep track of all customers for this season
        if (season.customer && !existing.customers.includes(season.customer.customer_name)) {
          existing.customers.push(season.customer.customer_name);
        }
      } else {
        // First occurrence of this season name
        seasonMap.set(seasonName, {
          season_id: season.season_id,
          season_name: seasonName,
          customer_id: season.customer_id,
          customer_name: season.customer
            ? season.customer.customer_name
            : "Unknown",
          customers: season.customer ? [season.customer.customer_name] : [],
          total_styles: styles.length,
          styles: styles.map((style) => ({
            style_id: style.style_id,
            style_no: style.style_no,
            style_name: style.style_name,
            created_at: style.createdAt,
          })),
        });
      }
    });

    // Convert map to array
    const seasonWiseData = Array.from(seasonMap.values());

    // Prepare chart data - grouped by season name
    const chartData = {
      barChartData: seasonWiseData.map((item) => ({
        name: item.season_name,
        styles: item.total_styles,
        customer: item.customers.length > 1 
          ? `${item.customers.length} customers` 
          : item.customer_name,
      })),

      pieChartData: seasonWiseData.map((item) => ({
        name: item.season_name,
        value: item.total_styles,
        fill: getColorForSeason(item.season_name),
      })),

      summary: {
        total_seasons: seasons.length,
        total_styles: seasonWiseData.reduce(
          (sum, item) => sum + item.total_styles,
          0
        ),
        average_styles_per_season:
          seasonWiseData.length > 0
            ? (
                seasonWiseData.reduce(
                  (sum, item) => sum + item.total_styles,
                  0
                ) / seasonWiseData.length
              ).toFixed(1)
            : 0,
        top_seasons: seasonWiseData
          .sort((a, b) => b.total_styles - a.total_styles)
          .slice(0, 5)
          .map((item) => ({
            season: item.season_name,
            styles: item.total_styles,
            customer: item.customer_name,
          })),
      },
    };

    res.status(200).json({
      success: true,
      message: "Season-wise styles fetched successfully",
      data: {
        seasonWiseData,
        chartData,
        metadata: {
          total_records: seasonWiseData.length,
          last_updated: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching season-wise styles:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching season-wise styles",
      error: error.message,
    });
  }
};

/**
 * Get seasonal trends over time
 */
exports.getSeasonalTrends = async (req, res) => {
  try {
    const { year } = req.query;

    const seasons = await Season.findAll({
      attributes: [
        "season_id",
        "season",
        "createdAt",
        [sequelize.fn("YEAR", sequelize.col("Season.createdAt")), "year"],
      ],
      include: [
        {
          model: Style,
          as: "seasons",
          attributes: ["style_id"],
          required: false,
        },
      ],
      where: year
        ? sequelize.where(
            sequelize.fn("YEAR", sequelize.col("Season.createdAt")),
            year
          )
        : undefined,
      order: [["createdAt", "ASC"]],
    });

    // Group by month/year for trends
    const trends = seasons.reduce((acc, season) => {
      const date = new Date(season.createdAt);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;

      if (!acc[monthYear]) {
        acc[monthYear] = {
          period: monthYear,
          seasons: 0,
          styles: season.seasons ? season.seasons.length : 0,
          season_names: [season.season],
        };
      } else {
        acc[monthYear].seasons += 1;
        acc[monthYear].styles += season.seasons ? season.seasons.length : 0;
        acc[monthYear].season_names.push(season.season);
      }

      return acc;
    }, {});

    const trendData = Object.values(trends).sort((a, b) =>
      a.period.localeCompare(b.period)
    );

    res.status(200).json({
      success: true,
      data: {
        trends: trendData,
        summary: {
          total_periods: trendData.length,
          total_styles_in_period: trendData.reduce(
            (sum, item) => sum + item.styles,
            0
          ),
          average_styles_per_period:
            trendData.length > 0
              ? (
                  trendData.reduce((sum, item) => sum + item.styles, 0) /
                  trendData.length
                ).toFixed(1)
              : 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching seasonal trends:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching seasonal trends",
      error: error.message,
    });
  }
};

/**
 * Get customer-wise season distribution
 */
exports.getCustomerSeasonDistribution = async (req, res) => {
  try {
    const customers = await Customer.findAll({
      attributes: [
        "customer_id",
        "customer_name",
        [
          sequelize.fn("COUNT", sequelize.col("seasons.season_id")),
          "total_seasons",
        ],
        [
          sequelize.fn("COUNT", sequelize.col("seasons->seasons.style_id")),
          "total_styles",
        ],
      ],
      include: [
        {
          model: Season,
          as: "seasons",
          attributes: [],
          required: false,
          include: [
            {
              model: Style,
              as: "seasons",
              attributes: [],
              required: false,
            },
          ],
        },
      ],
      group: ["Customer.customer_id", "Customer.customer_name"],
      order: [[sequelize.literal("total_styles"), "DESC"]],
      raw: false,
    });

    const distribution = customers.map((customer) => {
      const dataValues = customer.get({ plain: true });
      return {
        customer_id: dataValues.customer_id,
        customer_name: dataValues.customer_name,
        total_seasons: parseInt(dataValues.total_seasons) || 0,
        total_styles: parseInt(dataValues.total_styles) || 0,
        average_styles_per_season:
          parseInt(dataValues.total_seasons) > 0
            ? (
                parseInt(dataValues.total_styles) /
                parseInt(dataValues.total_seasons)
              ).toFixed(1)
            : 0,
      };
    });

    res.status(200).json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    console.error("Error fetching customer season distribution:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching customer season distribution",
      error: error.message,
    });
  }
};

/**
 * Get styles by specific season
 */
exports.getStylesBySeason = async (req, res) => {
  try {
    const { season_id } = req.params;

    const season = await Season.findByPk(season_id, {
      include: [
        {
          model: Style,
          as: "seasons",
          include: [
            {
              model: Customer,
              as: "customer",
              attributes: ["customer_name"],
            },
            {
              model: Factory,
              as: "factory",
              attributes: ["factory_name"],
            },
          ],
        },
        {
          model: Customer,
          as: "customer",
          attributes: ["customer_name"],
        },
      ],
    });

    if (!season) {
      return res.status(404).json({
        success: false,
        message: "Season not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        season_id: season.season_id,
        season_name: season.season,
        customer_id: season.customer_id,
        customer_name: season.customer
          ? season.customer.customer_name
          : "Unknown",
        styles: season.seasons || [],
        total_styles: season.seasons ? season.seasons.length : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching styles by season:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching styles by season",
      error: error.message,
    });
  }
};

/**
 * Get top seasons by style count
 */
exports.getTopSeasons = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const topSeasons = await Season.findAll({
      attributes: [
        "season_id",
        "season",
        [
          sequelize.fn("COUNT", sequelize.col("seasons.style_id")),
          "style_count",
        ],
      ],
      include: [
        {
          model: Style,
          as: "seasons",
          attributes: [],
          required: false,
        },
      ],
      group: ["Season.season_id", "Season.season"],
      order: [[sequelize.literal("style_count"), "DESC"]],
      limit: parseInt(limit),
    });

    res.status(200).json({
      success: true,
      data: topSeasons,
    });
  } catch (error) {
    console.error("Error fetching top seasons:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching top seasons",
      error: error.message,
    });
  }
};

/**
 * Get styles count by season for specific customer
 */
exports.getCustomerSeasonStyles = async (req, res) => {
  try {
    const { customer_id } = req.params;

    const data = await Customer.findByPk(customer_id, {
      include: [
        {
          model: Season,
          as: "seasons",
          attributes: ["season_id", "season"],
          include: [
            {
              model: Style,
              as: "seasons",
              attributes: ["style_id"],
              required: false,
            },
          ],
        },
      ],
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const seasonData = data.seasons.map((season) => ({
      season_id: season.season_id,
      season_name: season.season,
      style_count: season.seasons ? season.seasons.length : 0,
      styles: season.seasons
        ? season.seasons.map((style) => style.style_id)
        : [],
    }));

    res.status(200).json({
      success: true,
      data: {
        customer_id: data.customer_id,
        customer_name: data.customer_name,
        seasons: seasonData,
        total_styles: seasonData.reduce(
          (sum, item) => sum + item.style_count,
          0
        ),
      },
    });
  } catch (error) {
    console.error("Error fetching customer season styles:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching customer season styles",
      error: error.message,
    });
  }
};

/**
 * Get season statistics
 */
exports.getSeasonStats = async (req, res) => {
  try {
    // Get total seasons count
    const totalSeasons = await Season.count();

    // Get total styles across all seasons
    const totalStyles = await Style.count();

    // Get seasons with most styles
    const seasonsWithStyles = await Season.findAll({
      attributes: [
        "season_id",
        "season",
        [
          sequelize.fn("COUNT", sequelize.col("seasons.style_id")),
          "style_count",
        ],
      ],
      include: [
        {
          model: Style,
          as: "seasons",
          attributes: [],
          required: false,
        },
      ],
      group: ["Season.season_id", "Season.season"],
      order: [[sequelize.literal("style_count"), "DESC"]],
      limit: 10,
    });

    // Get recent seasons
    const recentSeasons = await Season.findAll({
      attributes: ["season_id", "season", "createdAt"],
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["customer_name"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 5,
    });

    res.status(200).json({
      success: true,
      data: {
        totalSeasons,
        totalStyles,
        averageStylesPerSeason:
          totalSeasons > 0 ? (totalStyles / totalSeasons).toFixed(1) : 0,
        topSeasons: seasonsWithStyles.map((season) => ({
          season_id: season.season_id,
          season_name: season.season,
          style_count: season.dataValues.style_count,
        })),
        recentSeasons: recentSeasons.map((season) => ({
          season_id: season.season_id,
          season_name: season.season,
          created_at: season.createdAt,
          customer_name: season.customer
            ? season.customer.customer_name
            : "Unknown",
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching season stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching season statistics",
      error: error.message,
    });
  }
};

/**
 * Get recent activity - latest styles and operations
 */
exports.getRecentActivity = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    // Get recent styles
    const recentStyles = await Style.findAll({
      attributes: [
        "style_id",
        "style_no",
        "style_name",
        "po_number",
        "createdAt",
      ],
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["customer_name"],
        },
        {
          model: Factory,
          as: "factory",
          attributes: ["factory_name"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
    });

    // Get recent main operations
    const recentOperations = await MainOperation.findAll({
      attributes: ["operation_id", "operation_name", "createdAt"],
      include: [
        {
          model: Style,
          as: "style",
          attributes: ["style_no", "style_name"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
    });

    res.status(200).json({
      success: true,
      data: {
        recentStyles: recentStyles.map((style) => ({
          style_id: style.style_id,
          style_no: style.style_no,
          style_name: style.style_name,
          po_number: style.po_number,
          customer_name: style.customer?.customer_name || "Unknown",
          factory_name: style.factory?.factory_name || "Unknown",
          created_at: style.createdAt,
        })),
        recentOperations: recentOperations.map((op) => ({
          operation_id: op.operation_id,
          operation_name: op.operation_name,
          style_no: op.style?.style_no || "Unknown",
          style_name: op.style?.style_name || "Unknown",
          created_at: op.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching recent activity",
      error: error.message,
    });
  }
};

/**
 * Get production insights - operations per style, completion rates, etc.
 */
exports.getProductionInsights = async (req, res) => {
  try {
    // Get styles with operation counts
    const stylesWithOps = await Style.findAll({
      attributes: ["style_id", "style_no", "style_name"],
      include: [
        {
          model: MainOperation,
          as: "operations",
          attributes: ["operation_id"],
          required: false,
          include: [
            {
              model: SubOperation,
              as: "subOperations",
              attributes: ["sub_operation_id"],
              required: false,
            },
          ],
        },
      ],
    });

    // Calculate insights
    const insights = {
      totalStyles: stylesWithOps.length,
      stylesWithOperations: stylesWithOps.filter(
        (s) => s.operations && s.operations.length > 0
      ).length,
      stylesWithoutOperations: stylesWithOps.filter(
        (s) => !s.operations || s.operations.length === 0
      ).length,
      averageOperationsPerStyle: 0,
      averageSubOperationsPerStyle: 0,
      topStylesByOperations: [],
    };

    let totalOps = 0;
    let totalSubOps = 0;
    const styleOpCounts = [];

    stylesWithOps.forEach((style) => {
      const opCount = style.operations ? style.operations.length : 0;
      let subOpCount = 0;

      if (style.operations) {
        style.operations.forEach((op) => {
          if (op.subOperations) {
            subOpCount += op.subOperations.length;
          }
        });
      }

      totalOps += opCount;
      totalSubOps += subOpCount;

      if (opCount > 0) {
        styleOpCounts.push({
          style_id: style.style_id,
          style_no: style.style_no,
          style_name: style.style_name,
          operations: opCount,
          subOperations: subOpCount,
        });
      }
    });

    insights.averageOperationsPerStyle =
      insights.stylesWithOperations > 0
        ? (totalOps / insights.stylesWithOperations).toFixed(1)
        : 0;
    insights.averageSubOperationsPerStyle =
      insights.stylesWithOperations > 0
        ? (totalSubOps / insights.stylesWithOperations).toFixed(1)
        : 0;

    insights.topStylesByOperations = styleOpCounts
      .sort((a, b) => b.operations - a.operations)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      data: insights,
    });
  } catch (error) {
    console.error("Error fetching production insights:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching production insights",
      error: error.message,
    });
  }
};

// Helper function to generate colors for seasons
function getColorForSeason(seasonName) {
  const colors = [
    "#6366F1",
    "#8B5CF6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#3B82F6",
    "#EC4899",
    "#14B8A6",
    "#F97316",
    "#8B5CF6",
  ];

  // Generate consistent color based on season name
  const index =
    Math.abs(
      seasonName.split("").reduce((acc, char) => {
        return acc + char.charCodeAt(0);
      }, 0)
    ) % colors.length;

  return colors[index];
}
