const { WorkstationSubmenu } = require("../models");
exports.createWS = async (req, res, next) => {
  console.log("Request body:", req.body);

  try {
    // Handle both formats:
    // 1. Direct workstation object {workstation_id, operations}
    // 2. Wrapped format {workstations: [{workstation_id, operations}]}
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
