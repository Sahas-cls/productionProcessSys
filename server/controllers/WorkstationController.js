const { where } = require("sequelize");
const { WorkstationSubmenu, Workstation, Layout } = require("../models");
exports.createWS = async (req, res, next) => {
  console.log("Request body:", req.body);
  return;
  try {
    const workstations = req.body.workstations
      ? req.body.workstations
      : [req.body];

    await WorkstationSubmenu.sequelize.transaction(async (t) => {
      for (const ws of workstations) {
        if (!ws || !ws.workstation_id || !Array.isArray(ws.operations)) {
          throw new Error(`Invalid workstation format: ${JSON.stringify(ws)}`);
        }

        const { workstation_id, operations } = ws;

        // Clear existing operations
        await WorkstationSubmenu.destroy({
          where: { workstation_id },
          transaction: t,
        });

        // Create new operations
        const submenuEntries = operations.map((op) => {
          if (!op.sub_operation_id) {
            throw new Error(
              `Operation missing sub_operation_id: ${JSON.stringify(op)}`
            );
          }
          return {
            workstation_id,
            sub_operation_id: op.sub_operation_id,
          };
        });

        await WorkstationSubmenu.bulkCreate(submenuEntries, { transaction: t });
      }
    });

    res.status(200).json({
      status: "success",
      message: "Operations saved successfully",
    });
  } catch (error) {
    console.error("Error saving operations:", error);
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
