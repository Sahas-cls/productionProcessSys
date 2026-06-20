const { Op, fn, Sequelize } = require("sequelize");
const { SubOperation } = require("../models");

exports.getSubOperations = async (req, res, next) => {
  const { keyword } = req.params;

  try {
    const query = {
      attributes: [
        [
          Sequelize.fn("DISTINCT", Sequelize.col("sub_operation_name")),
          "sub_operation_name",
        ],
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

    const subOperations = await SubOperation.findAll(query);

    return res.status(200).json({
      success: true,
      count: subOperations.length,
      data: subOperations,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Error fetching sub operations",
    });
  }
};
