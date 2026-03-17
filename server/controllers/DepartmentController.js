const db = require("../models");
const Department = db.Department;

exports.getDepartments = async (req, res, next) => {
  try {
    // Get factory_id from URL params instead of query
    const factoryId = parseInt(req.params.factory_id);

    // Validate factoryId
    if (isNaN(factoryId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid factory ID",
      });
    }

    const departments = await Department.findAll({
      where: { factory_id: factoryId },
    });

    res.status(200).json({
      status: "success",
      data: departments,
    });
  } catch (error) {
    next(error);
  }
};
