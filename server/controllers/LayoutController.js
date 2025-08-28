const {
  Layout,
  Workstation,
  sequelize,
  MainOperation,
  SubOperation,
  Style,
  Machine,
} = require("../models");

// to retrive data from layout tbl
exports.getLayouts = async (req, res, next) => {
  try {
    const layoutList = await Layout.findAll({
      include: [
        {
          model: Style,
          as: "style",
          include: [
            {
              model: MainOperation,
              as: "operations",
              include: [{ model: SubOperation, as: "subOperations" }],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.status(200).json({ status: "Success", data: layoutList });
  } catch (error) {
    return next(error);
  }
};

// to retrive all sub operations belongs to one layout
exports.getSubOperations = async (req, res, next) => {
  //
  const { id } = req.params;
  console.log(req.params);
  console.log("id ============== ", id);
  console.log("request recived");
  try {
    const subOps = await Layout.findByPk(id, {
      include: [
        {
          model: Style,
          as: "style",
          include: [
            {
              model: MainOperation,
              as: "operations",
              include: [{ model: SubOperation, as: "subOperations" }],
            },
          ],
        },
      ],
    });

    const allSubOperations = subOps.style.operations.flatMap(
      (op) => op.subOperations
    );

    res.status(200).json({ status: "success", data: allSubOperations });
  } catch (error) {
    return next(error);
  }
};

// to create new layout
exports.createLayout = async (req, res, next) => {
  //
  if (req?.user?.userRole !== "Admin") {
    const error = new Error("You don't have permission to perform this action");
    error.status = 401;
    throw error;
  }
  //   return;
  const { styleNo, styleDescriptoin, style, season, workstationCount } =
    req.body;

  try {
    const { createL, createWorkStation, subOperations } =
      await sequelize.transaction(async (t) => {
        // 1. Create layout
        const createL = await Layout.create(
          {
            style_id: styleNo,
            season_id: season,
            workstation_count: workstationCount,
          },
          { transaction: t }
        );

        // 2. Create workstations
        const workstationBulk = [];
        for (let i = 1; i <= workstationCount; i++) {
          workstationBulk.push({
            layout_id: createL.layout_id,
          });
        }

        const createWorkStation = await Workstation.bulkCreate(
          workstationBulk,
          {
            transaction: t,
            returning: true,
          }
        );

        // 3. Fetch sub operations related to the style via MainOperation
        const mainOperations = await MainOperation.findAll({
          where: { style_no: styleNo }, // assuming it's style_id in DB
          include: [
            {
              model: SubOperation,
              as: "subOperations", // must match the alias in your association
              include: { model: Machine, as: "machines" },
            },
          ],
          transaction: t,
        });

        // console.log("mo: ", mainOperations);
        // 4. Flatten the sub operations
        const subOperations = mainOperations.flatMap((mo) => mo.subOperations);
        // console.log("sub operations: ", subOperations);
        console.log("sub op: ", subOperations);
        return { createL, createWorkStation, subOperations };
      });

    res.status(201).json({
      status: "success",
      message: "Layout creation success",
      data: {
        workStations: createWorkStation,
        subOperations: subOperations,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// to delete layout
exports.deleteLayout = async (req, res, next) => {
  //
  const { layoutId } = req.params;
  try {
    const deleteLayout = await Layout.findByPk(layoutId);

    if (!deleteLayout) {
      const error = new Error("Cannot find layout on the database");
      error.status = 404;
      throw error;
    }

    await deleteLayout.destroy();

    res
      .status(200)
      .json({ status: "success", message: "Layout delete success" });
  } catch (error) {
    return next(error);
  }
};
