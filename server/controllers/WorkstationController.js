const { where } = require("sequelize");
// const {Workstation, WorkstationSubmenu} = require("../models")
const {
  WorkstationSubmenu,
  Workstation,
  Layout,
  SubOperation,
  MainOperation,
  Machine,
} = require("../models");

// to create a empty workstation
exports.createEmptyWS = async (req, res, next) => {
  //
  const { layoutId } = req.params;
  const { workstation_no } = req.body;
  console.log(req.body);
  try {
    const createWs = await Workstation.create({
      workstation_no,
      layout_id: layoutId,
    });

    res
      .status(200)
      .json({ status: "success", message: "Workstation create success" });
  } catch (error) {
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
  try {
    const workstations = await Workstation.findAll({
      where: { layout_id: id },
      include: [
        {
          model: WorkstationSubmenu,
          as: "subOperations",
          include: [
            {
              model: SubOperation,
              as: "suboperatoin",
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
    });

    res.status(200).json({
      status: "success",
      message: "data selected successfully",
      data: workstations,
    });

    // console.log("workstations: ", workstations);
  } catch (error) {
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

// to rename workstaion
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
