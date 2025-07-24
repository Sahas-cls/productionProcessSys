// to create new operation
const { where } = require("sequelize");
const { sequelize } = require("../models");
const {
  Style,
  MainOperation,
  SubOperation,
  Machine,
  NeedleType,
  NeedleTread,
  NeedleLooper,
  Helper,
} = require("../models");

exports.getBOList = async (req, res, next) => {
  try {
    console.log(req.body);

    const operations = await MainOperation.findAll({
      include: [
        {
          model: SubOperation,
          as: "subOperations",
          include: [
            {
              model: Machine,
              as: "machines",
              through: { attributes: [] },
              include: [
                {
                  model: NeedleType,
                  as: "needleTypes",
                },
                {
                  model: NeedleTread,
                  as: "needleTreads",
                },
                {
                  model: NeedleLooper,
                  as: "needleLoopers",
                },
              ],
            },
          ],
        },
        {
          model: Style,
          as: "style", // if you set alias when associating
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const helperOperations = await Helper.findAll({
      include: [{ model: Style, as: "style" }],
    });

    console.log("data selected success........!");
    res.status(200).json({ data: [...operations, ...helperOperations] });
  } catch (error) {
    console.error("Error fetching operation list:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.createOperation = async (req, res, next) => {
  console.log(req.body);
  const {
    styleNumber,
    mainOperation,
    operationName,
    operationNumber,
    smv,
    remarks,
    machineType,
    machineNo,
    machineName,
    machineBrand,
    machineLocation,
    needleType,
    needleCount,
    needleTreads,
    bobbinTreadLoopers,
  } = req.body;

  try {
    await sequelize.transaction(async (t) => {
      // 1. Check if style exists
      const styleExist = await Style.findOne({
        where: { style_no: styleNumber },
        transaction: t,
      });

      if (!styleExist) {
        const error = new Error("Provided style does not exist");
        error.status = 400;
        throw error;
      }

      // 2. Create main operation
      const createNewOP = await MainOperation.create(
        {
          style_no: styleExist.style_id, // Fixed: Should be style_id if that's the PK
          operation_name: operationName,
        },
        { transaction: t }
      );

      // 3. Create sub operation
      const createSubOP = await SubOperation.create(
        {
          main_operation_id: createNewOP.operation_id,
          sub_operation_name: operationName,
          msv: smv, // Note: Your field is 'msv' but input is 'smv'
          remark: remarks,
        },
        { transaction: t }
      );

      // 4. Find or create machine
      let machine;
      const existingMachine = await Machine.findOne({
        where: { machine_no: machineNo },
        transaction: t,
      });

      if (existingMachine) {
        machine = existingMachine;
      } else {
        machine = await Machine.create(
          {
            sub_operation_id: createSubOP.sub_operation_id,
            machine_no: machineNo,
            machine_name: machineName,
            machine_type: machineType,
            machine_brand: machineBrand,
            machine_location: machineLocation,
            needle_count: needleCount,
          },
          { transaction: t }
        );
      }

      // 5. Create needle types
      if (needleType && needleType.length > 0) {
        await Promise.all(
          needleType.map((needle) =>
            NeedleType.create(
              {
                type: needle.type || null,
                machine_id: machine.machine_id, // Fixed: Using the correct machine reference
                sub_operation_id: createSubOP.sub_operation_id,
              },
              { transaction: t }
            )
          )
        );
      }

      // 6. Create needle treads
      if (needleTreads && needleTreads.length > 0) {
        await Promise.all(
          needleTreads.map((tread) =>
            NeedleTread.create(
              {
                tread: tread,
                machine_id: machine.machine_id,
                sub_operation_id: createSubOP.sub_operation_id,
              },
              { transaction: t }
            )
          )
        );
      }

      // 7. Create bobbin loopers
      if (bobbinTreadLoopers && bobbinTreadLoopers.length > 0) {
        await Promise.all(
          bobbinTreadLoopers.map((looper) =>
            NeedleLooper.create(
              {
                looper_type: looper,
                machine_id: machine.machine_id,
                sub_operation_id: createSubOP.sub_operation_id,
              },
              { transaction: t }
            )
          )
        );
      }
      console.log("Operation create success");
      res.status(201).json({
        status: "success",
        message: "Operation bulletin saved successfully",
        mainOPId: createNewOP.operation_id,
      });
    });
  } catch (error) {
    console.log(error);
    console.error("Error in createOperation:", error);
    next(error);
  }
};

// edit main operation data
exports.editMainOperation = async (req, res, next) => {
  console.log(req.body);
  const { style_no, operation_name, operationId } = req.body;
  console.log("Operation name ", operation_name);
  console.log("parameter :", req.params);
  const moId = req.params.id;
  console.log("MO Id", moId);
  try {
    await sequelize.transaction(async (t) => {
      const Rstyle = await Style.findOne({
        where: { style_no: style_no },
        transaction: t,
      });

      if (!Rstyle) {
        // Throw an error to rollback the transaction
        throw new Error("Style not found");
      }

      await MainOperation.update(
        {
          style_no: Rstyle.style_id,
          operation_name: operation_name, // fix your variable name here
        },
        {
          where: { operation_id: moId },
          transaction: t,
        }
      );
    });

    // If we reach here, transaction was committed
    res.status(200).json({
      status: "success",
      message: "Operation update success",
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

// const handleBulkSubmit = async (operations, styleNumber, mainOperation) => {
//   console.log("Submitting bulk operations:", operations);

//   try {
//     const operationData = {
//       styleNumber,
//       mainOperation,
//       operations: operations.map(op => ({
//         ...op,
//         needleTreads: op.needleTreads.filter(tread => tread !== ""),
//         bobbinTreadLoopers: op.bobbinTreadLoopers.filter(tread => tread !== ""),
//       })),
//       currentOPId: localStorage.getItem("currentItem") || null
//     };

//     const response = await axios.post(
//       `${apiUrl}/api/operationBuleting/createBulkOB`,
//       operationData,
//       { withCredentials: true }
//     );

//     if (response.status === 200 || response.status === 201) {
//       const mainOPId = response.data.mainOPId;
//       localStorage.setItem("currentItem", mainOPId || null);

//       Swal.fire({
//         title: "Success",
//         text: "Bulk operation bulletin creation successful",
//         icon: "success",
//       });

//       // Refresh operations
//       const opsResponse = await axios.get(`${apiUrl}/api/operationBuleting`, {
//         withCredentials: true,
//       });
//       setOperations(opsResponse.data);

//       return mainOPId;
//     }
//   } catch (error) {
//     console.error("Error saving bulk operations:", error);
//     throw error;
//   }
// };

// to edit operation

// exports.createBulkOperations = async (req, res, next) => {
//   console.log(req.body);
//   console.log("creating operations");

//   try {
//     const {
//       styleNumber,
//       mainOperation,
//       operations,
//       currentOPId,
//       mainOperationName,
//     } = req.body;

//     // Validate required fields
//     if (!mainOperation) {
//       return res.status(400).json({
//         error: "mainOperation is required at the top level",
//       });
//     }

//     if (!operations || !Array.isArray(operations)) {
//       return res.status(400).json({
//         error: "operations must be an array",
//       });
//     }

//     await sequelize.transaction(async (t) => {
//       // 1. Verify style exists
//       const styleExist = await Style.findOne({
//         where: { style_no: styleNumber },
//         transaction: t,
//       });

//       if (!styleExist) {
//         throw new Error(`Style ${styleNumber} not found`);
//       }

//       // 2. Create Main Operation
//       const [mainOp, created] = await MainOperation.findOrCreate({
//         where: {
//           style_no: styleExist.style_id,
//           operation_name: mainOperationName,
//         },
//         defaults: {
//           style_no: styleExist.style_id,
//           operation_type_id: 1,
//           operation_name: mainOperationName,
//         },
//         transaction: t,
//       });

//       // 3. Process sub-operations in parallel
//       await Promise.all(
//         operations.map(async (op) => {
//           // Validate sub-operation
//           if (!op.operationName) {
//             throw new Error("Sub-operation requires operationName");
//           }

//           // Create SubOperation
//           const subOp = await SubOperation.create(
//             {
//               main_operation_id: mainOp.operation_id,
//               sub_operation_name: op.operationName,
//               operation_number: op.operationNumber,
//               msv: op.smv,
//               remark: op.remarks,
//             },
//             { transaction: t }
//           );

//           // MODIFIED: Check if machine exists by machine_no only
//           const [machine, machineCreated] = await Machine.findOrCreate({
//             where: {
//               machine_no: op.machineNo, // Only check by machine number
//             },
//             defaults: {
//               machine_no: op.machineNo,
//               machine_name: op.machineName,
//               machine_type: op.machineType,
//               machine_brand: op.machineBrand,
//               machine_location: op.machineLocation,
//               needle_count: op.needleCount,
//             },
//             transaction: t,
//           });

//           // MODIFIED: Always associate machine with sub-operation
//           await machine.addSubOperation(subOp, { transaction: t });

//           // Create needle-related records (regardless of machine creation)
//           if (op.needleType?.length > 0) {
//             await NeedleType.bulkCreate(
//               op.needleType.map((needle) => ({
//                 type: needle.type || null,
//                 machine_id: machine.machine_id,
//                 sub_operation_id: subOp.sub_operation_id,
//               })),
//               { transaction: t }
//             );
//           }

//           if (op.needleTreads?.length > 0) {
//             await NeedleTread.bulkCreate(
//               op.needleTreads.map((tread) => ({
//                 tread: tread,
//                 machine_id: machine.machine_id,
//                 sub_operation_id: subOp.sub_operation_id,
//               })),
//               { transaction: t }
//             );
//           }

//           if (op.bobbinTreadLoopers?.length > 0) {
//             await NeedleLooper.bulkCreate(
//               op.bobbinTreadLoopers.map((looper) => ({
//                 looper_type: looper,
//                 machine_id: machine.machine_id,
//                 sub_operation_id: subOp.sub_operation_id,
//               })),
//               { transaction: t }
//             );
//           }
//         })
//       );

//       console.log("operation create success");
//       return res.status(201).json({
//         status: "success",
//         mainOPId: mainOp.operation_id,
//         message: `Processed ${operations.length} operations`,
//         created: operations.length,
//       });
//     });
//   } catch (error) {
//     console.error("Bulk operation error:", error);
//     next(error);
//   }
// };

exports.createBulkOperations = async (req, res, next) => {
  try {
    const { styleNumber, mainOperation, operations, mainOperationName } =
      req.body;

    // Validate required fields
    if (
      !styleNumber ||
      !mainOperation ||
      !operations ||
      !Array.isArray(operations)
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await sequelize.transaction(async (t) => {
      // 1. Find or create Style
      const [style] = await Style.findOrCreate({
        where: { style_no: styleNumber },
        defaults: { style_no: styleNumber },
        transaction: t,
      });

      // 2. Create Main Operation
      const mainOp = await MainOperation.create(
        {
          style_no: style.style_id,
          operation_name: mainOperationName,
          operation_type_id: mainOperation, // e.g. '1' for Machine Operator
        },
        { transaction: t }
      );

      // 3. Cache to avoid duplicate machines
      const machineCache = {};

      // 4. Loop through operations
      for (const op of operations) {
        if (!op.operationName || !op.operationNumber || !op.machineNo) {
          throw new Error(
            `Missing required fields in operation: ${JSON.stringify(op)}`
          );
        }

        // 5. Find or create machine
        let machine;
        if (machineCache[op.machineNo]) {
          machine = machineCache[op.machineNo];
        } else {
          [machine] = await Machine.findOrCreate({
            where: { machine_no: op.machineNo },
            defaults: {
              machine_no: op.machineNo,
              machine_name: op.machineName,
              machine_type: op.machineType,
              machine_brand: op.machineBrand,
              machine_location: op.machineLocation,
              needle_count: op.needleCount || 1,
            },
            transaction: t,
          });
          machineCache[op.machineNo] = machine;
        }

        // 6. Create SubOperation
        const subOp = await SubOperation.create(
          {
            main_operation_id: mainOp.operation_id,
            sub_operation_name: op.operationName,
            operation_number: op.operationNumber,
            smv: parseFloat(op.smv),
            remark: op.remarks,
          },
          { transaction: t }
        );

        // 7. Associate machine and sub operation via junction table
        await subOp.addMachine(machine, { transaction: t });

        // 8. Create Needle Types
        if (op.needleType?.length) {
          await NeedleType.bulkCreate(
            op.needleType.map((needle) => ({
              type: needle.type,
              machine_id: machine.machine_id,
              sub_operation_id: subOp.sub_operation_id,
            })),
            { transaction: t }
          );
        }

        // 9. Create Needle Treads
        if (op.needleTreads?.length) {
          await NeedleTread.bulkCreate(
            op.needleTreads.map((tread) => ({
              tread: tread,
              machine_id: machine.machine_id,
              sub_operation_id: subOp.sub_operation_id,
            })),
            { transaction: t }
          );
        }

        // 10. Create Bobbin Tread Loopers
        if (op.bobbinTreadLoopers?.length) {
          await NeedleLooper.bulkCreate(
            op.bobbinTreadLoopers.map((looper) => ({
              looper_type: looper,
              machine_id: machine.machine_id,
              sub_operation_id: subOp.sub_operation_id,
            })),
            { transaction: t }
          );
        }
      }

      return { mainOPId: mainOp.operation_id };
    });

    res.status(201).json({
      success: true,
      mainOPId: result.mainOPId,
      message: `Created ${operations.length} operations`,
    });
  } catch (error) {
    console.error("Operation failed:", {
      error: error.message,
      stack: error.stack,
      requestBody: req.body,
    });
    res.status(500).json({
      error: "Operation failed",
      details: error.message,
    });
  }
};

exports.editOperation = async (req, res, next) => {};

// to update one single sub operation
exports.updateSubOperation = async (req, res, next) => {
  console.log("frontend parameters:- ", req.params);
  console.log("frontend data set:- ", req.body);
  // return;
  try {
    const { id } = req.params;
    const {
      soName: subOperationName,
      smv,
      remark,
      needleType: needleTypes,
      needleThread: needleThreads,
      needleLooper: needleLoopers,
    } = req.body;

    if (!id || !subOperationName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await sequelize.transaction(async (t) => {
      // 1. Update SubOperation
      const [updatedRows] = await SubOperation.update(
        {
          sub_operation_name: subOperationName,
          smv: smv || null,
          remark: remark || "-",
        },
        {
          where: { sub_operation_id: id },
          transaction: t,
        }
      );

      if (updatedRows === 0) throw new Error("SubOperation not found");

      // 2. Get associated machines (M:M)
      const subOp = await SubOperation.findByPk(id, {
        include: {
          model: Machine,
          as: "machines", // ✅ make sure association alias is correct
          through: { attributes: [] },
        },
        transaction: t,
      });

      const machines = subOp.machines || [];
      if (machines.length === 0)
        throw new Error("No associated machines found");

      // 3. Delete old needle records
      await Promise.all([
        NeedleType.destroy({ where: { sub_operation_id: id }, transaction: t }),
        NeedleTread.destroy({
          where: { sub_operation_id: id },
          transaction: t,
        }),
        NeedleLooper.destroy({
          where: { sub_operation_id: id },
          transaction: t,
        }),
      ]);

      // 4. Recreate for ALL machines
      const needleTypeData = [];
      const needleThreadData = [];
      const needleLooperData = [];

      for (const machine of machines) {
        const machineId = machine.machine_id;

        if (needleTypes?.length) {
          // console.log(needleTypes);
          needleTypeData.push(
            ...needleTypes.map((type) => ({
              type,
              machine_id: machineId,
              sub_operation_id: id,
            }))
          );
        }

        if (needleThreads?.length) {
          console.log(needleThreads);
          needleThreadData.push(
            ...needleThreads.map((thread) => ({
              tread: thread,
              machine_id: machineId,
              sub_operation_id: id,
            }))
          );
        }

        if (needleLoopers?.length) {
          needleLooperData.push(
            ...needleLoopers.map((looper) => ({
              looper_type: looper,
              machine_id: machineId,
              sub_operation_id: id,
            }))
          );
        }
      }

      await Promise.all([
        needleTypeData.length &&
          NeedleType.bulkCreate(needleTypeData, { transaction: t }),
        needleThreadData.length &&
          NeedleTread.bulkCreate(needleThreadData, { transaction: t }),
        needleLooperData.length &&
          NeedleLooper.bulkCreate(needleLooperData, { transaction: t }),
      ]);

      return { success: true };
    });

    res.status(200).json({ success: true, message: "SubOperation updated" });
  } catch (error) {
    console.error("Update failed:", error);
    res.status(500).json({ error: "Update failed", details: error.message });
  }
};

// to delete operation
exports.deleteOperation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const operation = await MainOperation.findByPk(id);
    if (!operation) {
      return res.status(404).json({ error: "Operation not found" });
    }

    await sequelize.transaction(async (t) => {
      // 1. Find all sub-operations linked to this main operation
      const subOperations = await SubOperation.findAll({
        where: { main_operation_id: id }, // Adjust key if necessary
        transaction: t,
      });

      // 2. Loop through and delete related needle records
      await Promise.all(
        subOperations.map(async (subOp) => {
          const subId = subOp.sub_operation_id; // or subOp.subOperationId depending on your schema
          console.log("sub operation id ======================= ", subId);
          // Delete associated needle records
          await NeedleType.destroy({
            where: { sub_operation_id: subId },
            transaction: t,
          });
          await NeedleTread.destroy({
            where: { sub_operation_id: subId },
            transaction: t,
          });
          await NeedleLooper.destroy({
            where: { sub_operation_id: subId },
            transaction: t,
          });

          // Set machines' subOperationId to null instead of deleting them
          await Machine.update(
            { subOperationId: null },
            { where: { subOperationId: subId }, transaction: t }
          );
        })
      );

      // 3. Delete sub-operations
      await SubOperation.destroy({
        where: { main_operation_id: id },
        transaction: t,
      });

      // 4. Delete main operation
      await operation.destroy({ transaction: t });
    });

    res.status(200).json({
      success: true,
      message: "Operation deleted successfully. Machines preserved.",
    });
  } catch (error) {
    console.error("Delete operation error:", {
      message: error.message,
      stack: error.stack,
      params: req.params,
    });
    res.status(500).json({
      error: "Delete failed",
      details: error.message,
    });
  }
};

// to delete sub operation
exports.deleteSubOperation = async (req, res, next) => {
  const subOpId = req.params.id;
  const t = await sequelize.transaction();

  try {
    await NeedleLooper.destroy({
      where: { sub_operation_id: subOpId },
      transaction: t,
    });

    await NeedleTread.destroy({
      where: { sub_operation_id: subOpId },
      transaction: t,
    });

    await NeedleType.destroy({
      // Assuming you meant this
      where: { sub_operation_id: subOpId },
      transaction: t,
    });

    await SubOperation.destroy({
      where: { sub_operation_id: subOpId },
      transaction: t,
    });

    await t.commit();

    console.log("Sub operation delete success with needle types");
    res.status(200).json({
      status: "success",
      message: "Sub-operation delete success",
    });
  } catch (error) {
    await t.rollback();
    console.error(error);
    return next(error);
  }
};

// ====================================
// create helper operations
// ====================================
exports.createHelperOps = async (req, res, next) => {
  console.log(req.body);

  const {
    styleNumber,
    mainOperation,
    operationNumber,
    operationName,
    remarks,
    smv,
  } = req.body;
  try {
    // find style is exist
    const isStyle = await Style.findOne({ where: { style_no: styleNumber } });
    if (!isStyle) {
      const error = new Error(
        "The requested style is not existing in style data table"
      );
      error.status = 403;
      console.log("requested style cannot find in style data table");
      return next(error);
    }

    // create new helper operation
    const createHelperOps = await Helper.create({
      style_id: isStyle.style_id,
      operation_type_id: mainOperation,
      operation_code: operationNumber,
      operation_name: operationName,
      mc_type: "",
      mc_smv: smv,
      comments: remarks,
    });
    console.log("Helper operation create success....");
    res.status(201).json({
      status: "success",
      message: "Helper operation creation success",
    });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};
