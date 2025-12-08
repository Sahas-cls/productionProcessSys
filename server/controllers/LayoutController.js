const {
  Layout,
  Workstation,
  sequelize,
  MainOperation,
  SubOperation,
  Style,
  Machine,
  Season,
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
// exports.createLayout = async (req, res, next) => {
//   //
//   if (req?.user?.userRole !== "Admin") {
//     const error = new Error("You don't have permission to perform this action");
//     error.status = 401;
//     throw error;
//   }
//   //   return;
//   const { styleNo, styleDescriptoin, style, season, workstationCount } =
//     req.body;

//   try {
//     const { createL, createWorkStation, subOperations } =
//       await sequelize.transaction(async (t) => {
//         // 1. Create layout
//         const createL = await Layout.create(
//           {
//             style_id: styleNo,
//             season_id: season,
//             workstation_count: workstationCount,
//           },
//           { transaction: t }
//         );

//         // 2. Create workstations
//         const workstationBulk = [];
//         for (let i = 1; i <= workstationCount; i++) {
//           workstationBulk.push({
//             layout_id: createL.layout_id,
//           });
//         }

//         const createWorkStation = await Workstation.bulkCreate(
//           workstationBulk,
//           {
//             transaction: t,
//             returning: true,
//           }
//         );

//         // 3. Fetch sub operations related to the style via MainOperation
//         const mainOperations = await MainOperation.findAll({
//           where: { style_no: styleNo }, // assuming it's style_id in DB
//           include: [
//             {
//               model: SubOperation,
//               as: "subOperations", // must match the alias in your association
//               include: { model: Machine, as: "machines" },
//             },
//           ],
//           transaction: t,
//         });

//         // console.log("mo: ", mainOperations);
//         // 4. Flatten the sub operations
//         const subOperations = mainOperations.flatMap((mo) => mo.subOperations);
//         // console.log("sub operations: ", subOperations);
//         console.log("sub op: ", subOperations);
//         return { createL, createWorkStation, subOperations };
//       });

//     res.status(201).json({
//       status: "success",
//       message: "Layout creation success",
//       data: {
//         workStations: createWorkStation,
//         subOperations: subOperations,
//       },
//     });
//   } catch (error) {
//     return next(error);
//   }
// };

exports.createLayout = async (req, res, next) => {
  // 1. Validate user permissions
  console.log("create layotu body: ", req.body);
  if (!req?.user || req?.user?.userRole !== "Admin") {
    const error = new Error("You don't have permission to perform this action");
    error.status = 401;
    return next(error);
  }

  // 2. Validate required fields
  const { styleNo, styleDescriptoin, style, season, workstationCount } =
    req.body;

  if (!styleNo || !season || !workstationCount) {
    const error = new Error(
      "Missing required fields: styleNo, season, and workstationCount are required"
    );
    error.status = 400;
    return next(error);
  }

  // 3. Validate workstationCount is a positive integer
  const workstationCountInt = parseInt(workstationCount);
  if (isNaN(workstationCountInt) || workstationCountInt <= 0) {
    const error = new Error("workstationCount must be a positive integer");
    error.status = 400;
    return next(error);
  }

  try {
    const { createL, createWorkStation, subOperations } =
      await sequelize.transaction(async (t) => {
        // 4. Validate style and season exist before creating layout
        const styleExists = await Style.findByPk(styleNo, { transaction: t });
        if (!styleExists) {
          throw new Error(`Style with ID ${styleNo} not found`);
        }

        const seasonExists = await Season.findByPk(season, { transaction: t });
        if (!seasonExists) {
          throw new Error(`Season with ID ${season} not found`);
        }

        // 5. Create layout
        const createL = await Layout.create(
          {
            style_id: styleNo,
            season_id: season,
            workstation_count: workstationCountInt,
          },
          { transaction: t }
        );

        // 6. Create workstations with workstation_no
        const workstationBulk = [];
        for (let i = 1; i <= workstationCountInt; i++) {
          workstationBulk.push({
            layout_id: createL.layout_id,
            workstation_no: `WS${i.toString().padStart(3, "0")}`, // Fixed: Added required workstation_no field
          });
        }

        const createWorkStation = await Workstation.bulkCreate(
          workstationBulk,
          {
            transaction: t,
            returning: true,
          }
        );

        // 7. Fetch sub operations related to the style via MainOperation
        const mainOperations = await MainOperation.findAll({
          where: { style_no: styleNo },
          include: [
            {
              model: SubOperation,
              as: "subOperations",
              include: { model: Machine, as: "machines" },
            },
          ],
          transaction: t,
        });

        // 8. Flatten the sub operations
        const subOperations = mainOperations.flatMap(
          (mo) => mo.subOperations || []
        );

        return { createL, createWorkStation, subOperations };
      });

    // 9. Send success response
    res.status(201).json({
      status: "success",
      message: "Layout creation successful",
      data: {
        layoutId: createL.layout_id,
        workStations: createWorkStation,
        subOperations: subOperations,
      },
    });
  } catch (error) {
    // 10. Handle specific error cases
    if (
      error.name === "SequelizeUniqueConstraintError" ||
      error.name === "SequelizeValidationError"
    ) {
      error.status = 400;
      error.message = error.errors?.[0]?.message || "Validation error";
    } else if (error.message.includes("not found")) {
      error.status = 404;
    } else if (!error.status) {
      error.status = 500;
    }

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
