const { where } = require("sequelize");
const db = require("../models");
const Department = require("../models/Department");
const User = db.User;
const Style = db.Style;
const Factory = db.Factory;

// to get all factories
exports.getFactories = async (req, res, next) => {
  try {
    const factories = await Factory.findAll();

    return res.status(200).json({
      success: true,
      data: factories,
    });
  } catch (error) {
    next(error);
  }
};

// to create new factory
exports.createFactory = async (req, res, next) => {
  if (req.user.userRole !== "Admin") {
    const error = new Error("Forbidden: Only Admins can create factories");
    error.status = 403;
    throw error;
  }

  try {
    const { factoryCode, factoryName, userId } = req.body;
    // console.log(userId);
    // console.log(req.body);

    // Check if factory code already exists
    const existingFactory = await Factory.findOne({
      where: { factory_code: factoryCode },
    });
    if (existingFactory) {
      return res.status(409).json({
        success: false,
        message: "Factory with this code already exists",
      });
    }

    // Create new factory
    // console.log("user id::: ", userId);
    const newFactory = await Factory.create({
      factory_code: factoryCode,
      factory_name: factoryName,
      created_by: parseInt(userId),
    });
    // console.log("factory create success", userId);
    return res.status(201).json({
      success: true,
      message: "Factory created successfully",
      data: newFactory,
    });
  } catch (error) {
    next(error);
  }
};

// edit factory
exports.updateFactory = async (req, res, next) => {
  if (req.user.userRole !== "Admin") {
    const error = new Error("Not enough permission to perform this action");
    error.status = 403;
    throw error;
  }
  // console.log(req.body);
  try {
    const { id } = req.params;
    // console.log("current id:", id);
    const { factoryCode, factoryName } = req.body;
    // console.log(req.body);

    // Find the factory to update
    const factory = await Factory.findByPk(id);
    if (!factory) {
      return res.status(404).json({
        success: false,
        message: "Factory not found",
      });
    }

    // Check if new factory code already exists (excluding current factory)
    if (factoryCode !== factory.factory_code) {
      const existingFactory = await Factory.findOne({
        where: { factory_code: factoryCode },
      });
      if (existingFactory) {
        return res.status(409).json({
          success: false,
          message: "Another factory with this code already exists",
        });
      }
    }

    // Update the factory
    await Factory.update(
      {
        factory_code: factoryCode,
        factory_name: factoryName,
      },
      {
        where: {
          factory_id: id,
        },
      }
    );
    // console.log(`${id} update success`);
    return res.status(200).json({
      success: true,
      message: "Factory updated successfully",
      data: factory,
    });
  } catch (error) {
    next(error);
  }
};

// delete a factory
exports.deleteFactory = async (req, res, next) => {
  try {
    // 🛡️ Permission check
    if (req?.user?.userRole !== "Admin") {
      const error = new Error(
        "You don't have permission to perform this action"
      );
      error.status = 401;
      throw error;
    }

    const { id } = req.params;
    const factory = await Factory.findByPk(id);

    if (!factory) {
      const error = new Error("Factory not found");
      error.status = 404;
      throw error;
    }

    // 🧩 Check related records
    // const isDep = await db.Department.findOne({
    //   where: { factory_id: factory.factory_id },
    // });
    const isUser = await User.findOne({
      where: { user_factory: factory.factory_id },
    });
    const isStyle = await Style.findOne({
      where: { factory_id: factory.factory_id },
    });

    // if (isDep) {
    //   const error = new Error(
    //     "Cannot delete this factory because departments are linked to it."
    //   );
    //   error.status = 400;
    //   throw error;
    // }

    if (isUser) {
      const error = new Error(
        "Cannot delete this factory because users are linked to it."
      );
      error.status = 400;
      throw error;
    }

    if (isStyle) {
      const error = new Error(
        "Cannot delete this factory because styles are linked to it."
      );
      error.status = 400;
      throw error;
    }

    // ✅ Safe to delete
    await factory.destroy();

    res.status(200).json({
      status: "success",
      message: "Factory deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
