const { where } = require("sequelize");
const db = require("../models");
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
  try {
    const { factoryCode, factoryName, userId } = req.body;
    console.log(userId);
    console.log(req.body);

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
    console.log("user id::: ", userId); //in here it's logind
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
  console.log(req.body);
  try {
    const { id } = req.params;
    console.log("current id:", id);
    const { factoryCode, factoryName } = req.body;
    console.log(req.body);

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
    console.log(`${id} update success`);
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
    const { id } = req.params;
    const factory = await Factory.findByPk(id);
    if (!factory) {
      const error = new Error("Factory cannot found");
      error.status = 404;
      next(error);
    }
    await factory.destroy();
    res
      .status(200)
      .json({ status: "success", message: "Factory delete success" });
  } catch (error) {
    return next(error);
  }
};
