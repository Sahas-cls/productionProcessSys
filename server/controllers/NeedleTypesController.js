const sequelize = require("sequelize");
const { NeedleTypeN } = require("../models");

// to create new needle type
exports.createNeedleType = async (req, res, next) => {
  console.log(req.body);
  const { type, category } = req.body;
  try {
    if (!type) {
      const error = new Error("Needle type required");
      error.status = 401;
      error.field = "type";
      throw error;
    }

    if (!category) {
      const error = new Error("Needle category required");
      error.status = 401;
      error.field = "category";
      throw error;
    }

    const isNew = await NeedleTypeN.findOne({ where: { needle_type: type } });

    if (isNew) {
      const error = new Error("The needle type already in database");
      error.status = 401;
      throw error;
    }

    await NeedleTypeN.create({
      needle_category: category,
      needle_type: type,
    });

    console.log("needle created");

    res.status(201).json({ status: "Ok", message: "Needle creation success" });
  } catch (error) {
    return next(error);
  }
};

// to edit needle type
exports.editNeedleType = async (req, res, next) => {
  console.log("📝 editing needle type");
  // const { id } = req.params;
  const { type, category, needle_type_id } = req.body;
  console.log("req,  ", req.body);
  // return;
  try {
    if (!needle_type_id) {
      const error = new Error("Needle type ID required");
      error.status = 400;
      throw error;
    }

    if (!type && !category) {
      const error = new Error(
        "At least one field (type or category) is required for update"
      );
      error.status = 400;
      throw error;
    }

    // Check if needle type exists
    const existingNeedleType = await NeedleTypeN.findByPk(needle_type_id);
    if (!existingNeedleType) {
      const error = new Error("Needle type not found");
      error.status = 404;
      throw error;
    }

    // If type is being updated, check for duplicates
    if (type && type !== existingNeedleType.needle_type) {
      const duplicateType = await NeedleTypeN.findOne({
        where: { needle_type: type },
      });

      if (duplicateType) {
        const error = new Error("The needle type already exists in database");
        error.status = 409;
        throw error;
      }
    }

    // check does name already exits?
    const isNew = await NeedleTypeN.findOne({ where: { needle_type: type } });

    if (isNew) {
      const error = new Error("The needle type already in database");
      error.status = 401;
      throw error;
    }

    // Prepare update data
    const updateData = {};
    if (type) updateData.needle_type = type;
    if (category) updateData.needle_category = category;

    // Update the needle type
    await NeedleTypeN.update(updateData, {
      where: { needle_type_id },
    });

    // Get updated record
    const updatedNeedleType = await NeedleTypeN.findByPk(needle_type_id);

    res.status(200).json({
      status: "Ok",
      message: "Needle type updated successfully",
      data: updatedNeedleType,
    });
  } catch (error) {
    return next(error);
  }
};

// to delete needle type
exports.deleteNeedleType = async (req, res, next) => {
  console.log("🗑️ deleting needle type");
  const { id: needle_type_id } = req.params;
  console.log("requested id: ", needle_type_id);
  // console.log(req.params);
  // return;
  try {
    if (!needle_type_id) {
      const error = new Error("Needle type ID required");
      error.status = 400;
      throw error;
    }

    // Check if needle type exists
    const existingNeedleType = await NeedleTypeN.findByPk(needle_type_id);
    if (!existingNeedleType) {
      const error = new Error("Needle type not found");
      error.status = 404;
      throw error;
    }

    // Delete the needle type
    await NeedleTypeN.destroy({
      where: { needle_type_id },
    });

    res.status(200).json({
      status: "Ok",
      message: "Needle type deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

// to get needle types
exports.getNeedleTypes = async (req, res, next) => {
  console.log("🪡 getting needle types");

  try {
    const needleTypes = await NeedleTypeN.findAll({
      order: [["createdAt", "DESC"]], // or any other ordering you prefer
    });

    res.status(200).json({
      status: "Ok",
      data: needleTypes,
      count: needleTypes.length,
    });
  } catch (error) {
    return next(error);
  }
};

// Optional: Get single needle type by ID
exports.getNeedleTypeById = async (req, res, next) => {
  console.log("🪡 getting needle type by ID");
  const { id } = req.params;

  try {
    if (!id) {
      const error = new Error("Needle type ID required");
      error.status = 400;
      throw error;
    }

    const needleType = await NeedleTypeN.findByPk(id);

    if (!needleType) {
      const error = new Error("Needle type not found");
      error.status = 404;
      throw error;
    }

    res.status(200).json({
      status: "Ok",
      data: needleType,
    });
  } catch (error) {
    return next(error);
  }
};
