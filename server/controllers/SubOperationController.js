const { Op, fn, Sequelize } = require("sequelize");
const { SubOperation } = require("../models");

exports.getSubOperations = async (req, res, next) => {
  const { keyword } = req.params;

  try {
    // Build the query
    const query = {
      attributes: [
        "sub_operation_id",
        "sub_operation_name",
        "sub_operation_number",
        // If you want to add other fields, include them here
      ],
      limit: 10,
      order: [["sub_operation_name", "ASC"]],
    };

    // Only add WHERE when keyword exists
    if (keyword && keyword.trim() !== "") {
      query.where = {
        sub_operation_name: {
          [Op.like]: `%${keyword}%`,
        },
      };
    }

    // If you want distinct sub_operation_name, use group by instead
    // This will return unique operation names with their IDs
    const subOperations = await SubOperation.findAll({
      ...query,
      // Group by sub_operation_name to get distinct names
      group: ["sub_operation_name"],
      // Select the minimum ID for each group (or you can use MAX, etc.)
      attributes: [
        "sub_operation_name",
        [
          Sequelize.fn("MIN", Sequelize.col("sub_operation_id")),
          "sub_operation_id",
        ],
        [
          Sequelize.fn("MIN", Sequelize.col("sub_operation_number")),
          "sub_operation_number",
        ],
      ],
    });

    return res.status(200).json({
      success: true,
      count: subOperations.length,
      data: subOperations,
    });
  } catch (error) {
    console.error("❌ Error fetching sub operations:", error);

    return res.status(500).json({
      success: false,
      message: "Error fetching sub operations",
      error: error.message,
    });
  }
};
