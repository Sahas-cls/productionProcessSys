const {
  Layout,
  Workstation,
  sequelize,
  MainOperation,
  SubOperation,
} = require("../models");

// to retrive data from layout tbl

// to create new layout
exports.createLayout = async (req, res, next) => {
  //
  console.log(req.body);
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
            },
          ],
          transaction: t,
        });

        console.log("mo: ", mainOperations);
        // 4. Flatten the sub operations
        const subOperations = mainOperations.flatMap((mo) => mo.subOperations);
        console.log("sub operations: ", subOperations);

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
