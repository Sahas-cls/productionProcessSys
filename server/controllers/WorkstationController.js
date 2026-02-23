const { where, Op } = require("sequelize");
// const {Workstation, WorkstationSubmenu} = require("../models")
const {
  WorkstationSubmenu,
  Workstation,
  Layout,
  SubOperation,
  MainOperation,
  Machine,
  Style,
  SubOperationMedia,
  HelperVideo,
  HelperImage,
  Helper,
  sequelize,
} = require("../models");
const { Sequelize } = require("sequelize");

// to create a empty workstation
exports.createEmptyWS = async (req, res, next) => {
  const { layoutId } = req.params;
  const { workstation_no } = req.body;

  const t = await sequelize.transaction(); // start transaction

  try {
    // 1️⃣ Create workstation
    const createWs = await Workstation.create(
      {
        workstation_no,
        layout_id: layoutId,
      },
      { transaction: t },
    );

    // 2️⃣ Increment workstation_count safely
    await Layout.increment("workstation_count", {
      by: 1,
      where: { layout_id: layoutId },
      transaction: t,
    });

    await t.commit(); // commit if everything success

    res.status(200).json({
      status: "success",
      message: "Workstation create success",
    });
  } catch (error) {
    await t.rollback(); // rollback if anything fails
    return next(error);
  }
};

// get specific workstation details with it's sub operations
exports.getWorkstation = async (req, res, next) => {
  const { id } = req.params;
  console.log("the request is reaches :  ", id);
  try {
    const workstation = await Workstation.findByPk(id);

    console.log("workstation ====================== ", workstation);

    // Safety check to avoid null crash
    // if (!workstation) {
    //   return res
    //     .status(404)
    //     .json({ status: "fail", message: "Workstation not found" });
    // }

    res.status(200).json({ status: "success", data: workstation });
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

exports.getWorkstations = async (req, res, next) => {
  //
  console.log(req.params);
  const { id } = req.params;
  console.log("param id: ", id);
  // const t = await sequelize.transaction();
  try {
    const workstations = await Workstation.findAll({
      where: { layout_id: id, is_helper_operation: false },

      include: [
        {
          model: WorkstationSubmenu,
          as: "subOperations",
          required: false,
          // where: {
          //   sub_operation_id: {
          //     [Op.ne]: null,
          //   },
          // },
          include: [
            {
              model: Helper,
              as: "helper",
              include: [
                {
                  model: HelperVideo,
                  as: "videos",
                  attributes: ["helper_video_id"],
                },
                {
                  model: HelperImage,
                  as: "images",
                  attributes: ["helper_image_id"],
                },
              ],
            },
            {
              model: SubOperation,
              as: "suboperatoin",
              attributes: {
                include: [
                  [
                    Sequelize.literal(`(
                  SELECT COUNT(*)
                  FROM suboperation_media sm
                  WHERE sm.sub_operation_id = \`subOperations->suboperatoin\`.\`sub_operation_id\`
                )`),
                    "media_count",
                  ],
                  [
                    Sequelize.literal(`(
                  SELECT COUNT(*)
                  FROM suboperation_images si
                  WHERE si.sub_operation_id = \`subOperations->suboperatoin\`.\`sub_operation_id\`
                )`),
                    "image_count",
                  ],
                ],
              },

              include: [
                {
                  model: MainOperation,
                  as: "mainOperation",
                },
                {
                  model: Machine,
                  as: "machines",
                },
              ],
            },
          ],
        },
      ],
      order: [["workstation_no", "ASC"]],
      // transaction: t,
    });

    // const HWorkstations = await Workstation.findAll({
    //   where: { layout_id: id, is_helper_operation: true },
    //   include: [
    //     {
    //       model: WorkstationSubmenu,
    //       as: "subOperations",
    //       required: false,
    //       where: {
    //         helper_id: {
    //           [Op.ne]: null,
    //         },
    //       },
    //       include: [
    //         {
    //           model: Helper,
    //           as: "helper",
    //           include: [
    //             {
    //               model: HelperVideo,
    //               as: "videos",
    //               attributes: ["helper_video_id"],
    //             },
    //             {
    //               model: HelperImage,
    //               as: "images",
    //               attributes: ["helper_image_id"],
    //             },
    //           ],
    //         },
    //       ],
    //     },
    //   ],
    //   transaction: t,
    // });

    // await t.commit();

    res.status(200).json({
      status: "success",
      message: "data selected successfully",
      data: workstations,
      // helperOp: HWorkstations,
    });

    // console.log("workstations: ", workstations);
  } catch (error) {
    // await t.rollback();
    return next(error);
  }
};

exports.createWS = async (req, res, next) => {
  console.log("Request body:", req.body);

  try {
    const { workstation_id, operations, workstation_no } = req.body;

    // Validate required fields
    if (!workstation_id) {
      return res.status(400).json({
        status: "error",
        message: "Workstation ID is required",
      });
    }

    await WorkstationSubmenu.sequelize.transaction(async (t) => {
      // 1. First find the existing workstation to get its layout_id
      const existingWorkstation = await Workstation.findByPk(workstation_id, {
        transaction: t,
      });

      if (!existingWorkstation) {
        throw new Error(`Workstation ${workstation_id} not found`);
      }

      const layout_id = existingWorkstation.layout_id;
      if (!layout_id) {
        throw new Error(
          `No layout_id associated with workstation ${workstation_id}`,
        );
      }

      // 2. Update workstation number if provided
      if (workstation_no !== undefined && workstation_no !== null) {
        await existingWorkstation.update(
          {
            workstation_no: workstation_no,
          },
          { transaction: t },
        );
      }

      // 3. Clear existing operations for this workstation
      await WorkstationSubmenu.destroy({
        where: { workstation_id },
        transaction: t,
      });

      // 4. Create new operations
      if (operations && operations.length > 0) {
        const submenuEntries = operations.map((op) => {
          if (!op.sub_operation_id) {
            throw new Error(
              `Operation missing sub_operation_id: ${JSON.stringify(op)}`,
            );
          }
          return {
            workstation_id,
            sub_operation_id: op.sub_operation_id,
            operation_no: op.operation_no || null,
            operation_name: op.operation_name || null,
            machine_type: op.machine_type || null,
            smv: op.smv || 0,
            // Add other fields if your model supports them
          };
        });

        await WorkstationSubmenu.bulkCreate(submenuEntries, { transaction: t });
      }
    });

    res.status(200).json({
      status: "success",
      message: "Workstation and operations saved successfully",
    });
  } catch (error) {
    console.error("Error saving workstation operations:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

exports.deleteWorkstation = async (req, res, next) => {
  const { id } = req.params;

  try {
    await WorkstationSubmenu.sequelize.transaction(async (t) => {
      // First find the workstation with its layout
      const workstation = await Workstation.findOne({
        where: { workstation_id: id },
        include: [
          {
            model: Layout,
            as: "layout",
          },
        ],
        transaction: t,
      });
      if (!workstation) {
        throw new Error("Workstation not found");
      }

      console.log("layout ================ : ", workstation);
      // Delete all associated operations
      await WorkstationSubmenu.destroy({
        where: { workstation_id: id },
        transaction: t,
      });

      // Delete the workstation
      const deletedCount = await Workstation.destroy({
        where: { workstation_id: id },
        transaction: t,
      });

      if (deletedCount === 0) {
        throw new Error("Workstation deletion failed");
      }

      // Decrement workstation_count in the associated layout
      if (workstation.layout) {
        await Layout.decrement("workstation_count", {
          by: 1,
          where: { layout_id: workstation.layout_id },
          transaction: t,
        });
      }
    });

    res.status(200).json({
      status: "success",
      message: "Workstation deleted and count decremented successfully",
    });
  } catch (error) {
    console.error("Error deleting workstation:", error);
    res.status(error.message.includes("not found") ? 404 : 500).json({
      status: "error",
      message: error.message,
    });
  }
};

// to add a sub opeartion to workstation
exports.addSubOperation = async (req, res, next) => {
  //
  console.log(req.body);
  console.log(req.params);
  const { workstation_id, sub_operation_id } = req.body;
  try {
    const createSO = await WorkstationSubmenu.create({
      workstation_id,
      sub_operation_id,
    });

    res
      .status(200)
      .json({ status: "success", message: "sub operation created" });
  } catch (error) {
    return next(error);
  }
};

// to delete sub operation from workstation
exports.deleteSubOperation = async (req, res, next) => {
  //
  console.log(req.body);
  console.log(req.params);
  const { subOpId, wsId } = req.params;

  try {
    const isdelete = await WorkstationSubmenu.destroy({
      where: { sub_operation_id: subOpId, workstation_id: wsId },
    });

    res
      .status(200)
      .json({ status: "succes", message: "Operation delete success" });
  } catch (error) {
    return next(error);
  }
};

exports.deleteHOperation = async (req, res, next) => {
  //
  console.log(req.body);
  console.log(req.params);
  const { helperId, wsId } = req.params;

  try {
    const isdelete = await WorkstationSubmenu.destroy({
      where: { helper_id: helperId, workstation_id: wsId },
    });

    res
      .status(200)
      .json({ status: "succes", message: "Operation delete success" });
  } catch (error) {
    return next(error);
  }
};

// to rename workstation
exports.workstationId = async (req, res, next) => {
  //
  const { workstationId } = req.params;
  const { workstation_no } = req.body;
  // console.log(workstationId);
  // console.log(req.body);
  // return;
  try {
    if (!workstationId || workstationId === null) {
      const error = new Error("Workstation number is required");
      error.status = 400;
      throw error;
    }

    const rename = await Workstation.update(
      { workstation_no: workstation_no },
      { where: { workstation_id: workstationId } },
    );

    res
      .status(200)
      .json({ status: "success", message: "Workstation update success" });
  } catch (error) {
    return next(error);
  }
};

// to update sequence number
exports.updateSequenceNo = async (req, res, next) => {
  const workstations = req.body;

  try {
    // 1️⃣ Validate request body
    if (!Array.isArray(workstations) || workstations.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No workstations provided",
      });
    }

    // 2️⃣ Build update promises
    const updatePromises = workstations.map((ws) => {
      // extra safety (optional but recommended)
      if (ws.workstation_id === undefined || ws.sequence_number === undefined) {
        throw new Error("Invalid workstation payload");
      }

      return Workstation.update(
        { sequence_number: ws.sequence_number },
        { where: { workstation_id: ws.workstation_id } },
      );
    });

    // 3️⃣ Execute all updates in parallel
    await Promise.all(updatePromises);

    // 4️⃣ Respond once everything is done
    return res.status(200).json({
      status: "ok",
      message: "Workstation sequence numbers updated successfully",
    });
  } catch (error) {
    console.error("updateSequenceNo error:", error);

    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to update sequence numbers",
    });
  }
};

// to create new helper workstation
exports.createHelperWorkstation = async (req, res, next) => {
  // const { workstationNo, layoutId } = req.body;
  console.log("req body: ", req.body);
  console.log(req.user);
  const { userRole } = req.user;
  // return;

  // return;
  const { workstationNo, layoutId } = req.body;
  try {
    if (userRole != "SuperAdmin" && userRole != "Admin") {
      const error = new Error(
        "You don't have permission to perform this action",
      );
      error.status = 401;
      throw error;
    }
    const isNameTaken = await Workstation.findOne({
      where: { layout_id: layoutId, workstation_no: workstationNo },
    });

    if (isNameTaken) {
      const error = new Error(
        "The provided name is already exist in current layout",
      );
      error.status = 400;
      throw error;
    }

    const createWS = await Workstation.create({
      workstation_no: workstationNo,
      layout_id: layoutId,
      is_helper_operation: true,
    });

    res
      .status(201)
      .json({ status: "Ok", message: "Workstation create success" });
  } catch (error) {
    console.error(error);
    res
      .status(error.status || 500)
      .json({ status: "Failed", message: `${error}` });
    return;
  }
  // console.log(`workstation no:${workstationNo} | layoutId:${layoutId}`);
};

// to get helper operation workstation
exports.getHelperWorkstation = async (req, res, next) => {
  // NOTE get all helper workstations with layout id
  const { layoutId } = req.params;
  console.log("layout id: ", layoutId);
  try {
    const workstations = await Workstation.findAll({
      where: { layout_id: layoutId, is_helper_operation: true },
      include: [
        {
          model: WorkstationSubmenu,
          as: "subOperations",
          required: false,
          where: {
            helper_id: {
              [Op.ne]: null,
            },
          },
          include: [
            {
              model: Helper,
              as: "helper",
              include: [
                {
                  model: HelperVideo,
                  as: "videos",
                  attributes: ["helper_video_id"],
                },
                {
                  model: HelperImage,
                  as: "images",
                  attributes: ["helper_image_id"],
                },
              ],
            },
          ],
        },
      ],
    });

    if (workstations) {
      res.status(200).json({ data: workstations, message: "Ok" });
    }
  } catch (error) {
    console.error(error);
  }
};

// Add helper operation to station
exports.addHelperOperation = async (req, res, next) => {
  //
  console.log("helper add");
  console.log(req.body);
  console.log(req.params);
  const { workstation_id, sub_operation_id, layout_id } = req.body;
  // return;
  const { userRole } = req.user;
  console.log(userRole);
  if (userRole != "Admin" && userRole != "SuperAdmin") {
    return res.status(400).json({
      status: "Failed",
      message: "You don't have access to perform this action",
    });
  }
  // const { workstation_id, sub_operation_id } = req.body;
  try {
    const createSO = await WorkstationSubmenu.create({
      workstation_id,
      helper_id: sub_operation_id,
      sub_operation_id: null,
    });
    console.log(createSO);
    res
      .status(200)
      .json({ status: "success", message: "sub operation created" });
  } catch (error) {
    console.error(error);
    return next(error);
  }
};
