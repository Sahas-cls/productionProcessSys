// to create new operation
const { where } = require("sequelize");
const { processExcelFile } = require("../utils/excelProcessor");
const { sequelize } = require("../models");
const ExcelJs = require("exceljs");
const fs = require("fs");
const {
  Style,
  MainOperation,
  SubOperation,
  User,
  Machine,
  NeedleType,
  NeedleTread,
  NeedleLooper,
  NeedleTypeN,
  Department,
  Helper,
  SubOperationMachine,
  SubOperationLog,
  Notification,
  UserCategory,
  Thread,
  StyleMedia,
  OpNeedles,
} = require("../models");
const { title } = require("process");
const { singularize } = require("sequelize/lib/utils");

exports.getBOList = async (req, res, next) => {
  try {
    console.log(req.body);

    const operations = await Style.findAll({
      include: [
        {
          model: MainOperation,
          as: "operations",
          required: true, // <-- only include styles that have main operations
          include: [
            {
              model: SubOperation,
              as: "subOperations",
              include: [
                {
                  model: Machine,
                  as: "machines",
                  through: { attributes: [] },
                },
                {
                  model: NeedleTypeN,
                  as: "needle_type",
                },
                {
                  model: NeedleLooper,
                  as: "needle_loopers",
                },
                // Add Thread association here
                {
                  model: Thread,
                  as: "thread", // Make sure this matches your association alias
                  attributes: [
                    "thread_id",
                    "thread_category",
                    "description",
                    "status",
                  ], // Only select needed fields
                },
              ],
            },
          ],
        },
        {
          model: StyleMedia,
          as: "style_medias",
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    console.log("data selected success........!");
    res.status(200).json({ data: operations });
  } catch (error) {
    console.error("Error fetching operation list:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// to get operations and suboperations for specific style
exports.getSBO = async (req, res, next) => {
  const { styleId } = req.params;
  try {
    console.log(req.body);

    // const operations = await Style.findOne({
    //   include: [
    //     {
    //       model: MainOperation,
    //       as: "operations",
    //       include: [
    //         {
    //           model: SubOperation,
    //           as: "subOperations",
    //           include: [
    //             {
    //               model: Machine,
    //               as: "machines",
    //               through: { attributes: [] },
    //             },
    //             {
    //               model: OpNeedles,
    //               as: "needles",
    //               include: [
    //                 {
    //                   model: Thread,
    //                   as: "thread",
    //                 },
    //               ],
    //             },
    //             {
    //               model: NeedleTypeN,
    //               as: "needle_type",
    //             },
    //             {
    //               model: Thread,
    //               as: "thread",
    //             },
    //             {
    //               model: Thread,
    //               as: "looper",
    //             },
    //           ],
    //         },
    //       ],
    //     },
    //   ],
    //   where: {
    //     style_id: styleId,
    //   },
    // });

    const operations = await Style.findOne({
      where: { style_id: styleId },

      include: [
        {
          model: MainOperation,
          as: "operations",

          include: [
            {
              model: SubOperation,
              as: "subOperations",

              include: [
                {
                  model: Machine,
                  as: "machines",
                  through: { attributes: [] },
                },
                {
                  model: NeedleTypeN,
                  as: "needle_type",
                },
                {
                  model: Thread,
                  as: "bobbin",
                },
                {
                  model: Thread,
                  as: "looper",
                },
                {
                  model: OpNeedles,
                  as: "needles",

                  include: [
                    {
                      model: Thread,
                      as: "thread",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const helperOp = await Helper.findAll({ where: { style_id: styleId } });

    console.log("data selected success one ........!");
    // res.status(200).json({ data: [...operations, ...helperOperations] });
    res.status(200).json({ data: operations, helperOp: helperOp });
  } catch (error) {
    console.error("Error fetching operation list:", error);
    // res.status(500).json({ error: "Something went wrong" });
    return next(error);
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
        { transaction: t },
      );

      // 3. Create sub operation
      const createSubOP = await SubOperation.create(
        {
          main_operation_id: createNewOP.operation_id,
          sub_operation_name: operationName,
          msv: smv, // Note: Your field is 'msv' but input is 'smv'
          remark: remarks,
        },
        { transaction: t },
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
          { transaction: t },
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
              { transaction: t },
            ),
          ),
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
              { transaction: t },
            ),
          ),
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
              { transaction: t },
            ),
          ),
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

// to create one main operation based on style
exports.createMainOperation = async (req, res, next) => {
  //
  if (req?.user?.userRole !== "Admin" && req?.user?.userRole !== "SuperAdmin") {
    const error = new Error("You don't have permission to perform this action");
    error.status = 401;
    throw error;
  }
  const { style_no, operation_type, operation_name } = req.body;

  try {
    const createOPeration = await MainOperation.create({
      style_no,
      operation_type_id: operation_type,
      operation_name: operation_name,
    });

    res
      .status(200)
      .json({ status: "success", message: "Operation create success" });
  } catch (error) {
    console.error("Error while creating main operation: ", error);
    return next(error);
  }
};

// to create sub operation based on main operation
exports.createSubOp = async (req, res, next) => {
  console.log("request body: ", req.body);

  if (req?.user?.userRole !== "Admin" && req?.user?.userRole !== "SuperAdmin") {
    const error = new Error("You don't have permission to perform this action");
    error.status = 401;
    throw error;
  }

  const {
    subOperationNo,
    smv,
    subOperationName,
    machineType,
    machineNo, // This is now machine_id from frontend
    machineName,
    needleCount,
    needleType, // This is now needle_type_id from frontend
    bobbinThread, // This is now thread_id for looper from frontend
    needleThreads, // This is now thread_id for thread from frontend
    spi,
    remark,
    mainOperation_id,
  } = req.body;

  try {
    await sequelize.transaction(async (t) => {
      // 1. Check main operation exists
      const mainOp = await MainOperation.findByPk(mainOperation_id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!mainOp) {
        const error = new Error("Main operation not found");
        error.status = 404;
        throw error;
      }

      // 2. Validate machine exists (now using machine_id from machineNo)
      const machine = await Machine.findByPk(machineNo, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!machine) {
        const error = new Error("Machine not found");
        error.status = 404;
        throw error;
      }

      // 3. Validate needle type exists if provided
      let needleTypeRecord = null;
      if (needleType) {
        needleTypeRecord = await NeedleTypeN.findByPk(needleType, {
          transaction: t,
        });

        if (!needleTypeRecord) {
          const error = new Error("Needle type not found");
          error.status = 404;
          throw error;
        }
      }

      // 4. Validate bobbin thread (looper) exists if provided
      let bobbinThreadRecord = null;
      if (bobbinThread) {
        bobbinThreadRecord = await Thread.findByPk(bobbinThread, {
          transaction: t,
        });

        if (!bobbinThreadRecord) {
          const error = new Error("Bobbin thread/looper not found");
          error.status = 404;
          throw error;
        }
      }

      // 5. Validate needle thread exists if provided
      let needleThreadRecord = null;
      if (needleThreads) {
        needleThreadRecord = await Thread.findByPk(needleThreads, {
          transaction: t,
        });

        if (!needleThreadRecord) {
          const error = new Error("Needle thread not found");
          error.status = 404;
          throw error;
        }
      }

      // 6. Create sub-operation with single foreign key references
      const subOperation = await SubOperation.create(
        {
          main_operation_id: mainOperation_id,
          sub_operation_number: subOperationNo,
          sub_operation_name: subOperationName,
          smv,
          remark,
          needle_count: needleCount,
          machine_type: machineType,
          spi: spi || null,
          needle_type_id: needleType || null,
          looper_id: bobbinThread || null, // bobbinThread is looper_id
          thread_id: needleThreads || null, // needleThreads is thread_id
          created_by: req.user?.userId || null, // Add created_by from user session
        },
        { transaction: t },
      );

      // 7. Link machine to sub-operation through junction table
      await SubOperationMachine.create(
        {
          sub_operation_id: subOperation.sub_operation_id,
          machine_id: machine.machine_id,
        },
        { transaction: t },
      );

      // Note: Removed the bulkCreate for needleTypes, needleTreads, and needleLoopers
      // since we're now using single foreign key references directly in SubOperation
    });

    res.status(201).json({
      success: true,
      message: "Sub-operation created successfully",
    });
  } catch (error) {
    console.error("Error creating sub-operation:", error);

    // Handle validation errors
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors.map((err) => ({
          field: err.path,
          message: err.message,
        })),
      });
    }

    // Handle foreign key constraint errors
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Invalid reference data provided",
        error: error.parent?.detail || error.message,
      });
    }

    next(error);
  }
};

// edit main operation data
exports.editMainOperation = async (req, res, next) => {
  // console.log(req.body);
  if (req?.user?.userRole !== "Admin" && req?.user?.userRole !== "SuperAdmin") {
    const error = new Error("You don't have permission to perform this action");
    error.status = 401;
    throw error;
  }
  const { style_no, operation_name, operationId } = req.body;
  // console.log("Operation name ", operation_name);
  // console.log("parameter :", req.params);
  const moId = req.params.id;
  // console.log("MO Id", moId);
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
        },
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

// to create bulk operations including, Main Operation, SubOperations, Machines, NeedleTypes, NeedleTreads, NeedleLoopers
exports.createBulkOperations = async (req, res, next) => {
  // console.log("request body: ", req.body);
  // console.log("req.user: ", req.user);
  // console.log("looper: ", req.body.operations[0].bobbinTreadLoopers);
  // return;
  try {
    console.log("user data: ", req.user);
    if (
      req?.user?.userRole !== "Admin" &&
      req?.user?.userRole !== "SuperAdmin"
    ) {
      const error = new Error(
        "You don't have permission to perform this action",
      );
      error.status = 401;
      throw error;
    }
    const { styleNumber, mainOperation, operations, mainOperationName } =
      req.body;

    // Validate required fields
    if (
      !styleNumber ||
      !mainOperation ||
      !operations ||
      !Array.isArray(operations)
    ) {
      const error = new Error("Missing required fields");
      error.status = 400;
      return next(error);
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
          operation_type_id: mainOperation,
          created_by: req.user.userId || null,
        },
        { transaction: t },
      );

      // 3. Cache to avoid duplicate machines
      const machineCache = {};

      // 4. Loop through operations
      for (const op of operations) {
        // console.log("thread id: ", op.needleTreads);
        // console.log("looper id: ", op.bobbinTreadLoopers);
        // console.log("needle type id: ", op.needleTypeId);

        if (!op.operationName || !op.operationNumber || !op.machineNo) {
          throw new Error(
            `Missing required fields in operation: ${JSON.stringify(op)}`,
          );
        }

        // 5. Find or create machine (remove needle_count from defaults)
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
              // Removed needle_count from here as it's not in Machine model
            },
            transaction: t,
          });
          machineCache[op.machineNo] = machine;
        }

        // 6. Create SubOperation with single IDs only
        const subOp = await SubOperation.create(
          {
            main_operation_id: mainOp.operation_id,
            sub_operation_name: op.operationName,
            sub_operation_number: op.operationNumber,
            machine_type: op.machineType,
            spi: op.spi || null,
            smv: parseFloat(op.smv) || 0,
            remark: op.remarks,
            needle_count: op.needleCount || 1,
            thread_id: op.needleTreads || null,
            needle_type_id: op.needleTypeId || null,
            looper_id: op.bobbinTreadLoopers || null,
            created_by: req.user.userId || null,
          },
          { transaction: t },
        );

        // 7. Associate machine and sub operation via junction table
        await subOp.addMachine(machine, { transaction: t });

        // REMOVED: Array handling for NeedleTread and NeedleLooper
        // Since you're storing single IDs directly in SubOperation table

        // Optional: If you still want to create single entries in NeedleTread/NeedleLooper tables
        // (for history/audit purposes), you can do:
        // if (op.needleTreads) {
        //   await NeedleTread.create(
        //     {
        //       tread_id: op.needleTreads,
        //       machine_id: machine.machine_id,
        //       sub_operation_id: subOp.sub_operation_id,
        //     },
        //     { transaction: t }
        //   );
        // }

        // if (op.bobbinTreadLoopers) {
        //   await NeedleLooper.create(
        //     {
        //       looper_thread_id: op.bobbinTreadLoopers,
        //       machine_id: machine.machine_id,
        //       sub_operation_id: subOp.sub_operation_id,
        //     },
        //     { transaction: t }
        //   );
        // }
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
exports.updateSubOperation = async (req, res) => {
  const t = await sequelize.transaction();

  // console.log("sub op update req body: ", req.body);

  try {
    const { id } = req.params;

    const {
      sub_operation_name,
      smv,
      remark,
      sub_operation_number,
      needle_count,
      spi,
      machine_type,
      machine_id,

      // OLD SINGLE NEEDLE
      needle_type_id,

      // THREADS
      needle1_thread_id,
      needle2_thread_id,
      bobbin_thread_id,
      looper_thread_id,
    } = req.body;

    /* ------------------------------------ */
    /* VALIDATION */
    /* ------------------------------------ */
    if (!id || !sub_operation_name) {
      await t.rollback();
      return res.status(400).json({
        error: "SubOperation ID and name are required",
      });
    }

    /* ------------------------------------ */
    /* 1) FIND SUB OPERATION */
    /* ------------------------------------ */
    const currentSubOperation = await SubOperation.findByPk(id, {
      transaction: t,
      include: [{ model: Machine, as: "machines" }],
    });

    if (!currentSubOperation) {
      await t.rollback();
      return res.status(404).json({ error: "SubOperation not found" });
    }

    /* ------------------------------------ */
    /* 2) LOG OLD DATA */
    /* ------------------------------------ */
    await SubOperationLog.create(
      {
        sub_operation_id: currentSubOperation.sub_operation_id,
        main_operation_id: currentSubOperation.main_operation_id,
        sub_operation_number: currentSubOperation.sub_operation_number,
        performed_action: "Update",
        sub_operation_name: currentSubOperation.sub_operation_name,
        smv: currentSubOperation.smv,
        remark: currentSubOperation.remark,
        needle_count: currentSubOperation.needle_count,
        machine_type: currentSubOperation.machine_type,
        spi: currentSubOperation.spi,
        needle_type_id: currentSubOperation.needle_type_id,
        bobbin_id: currentSubOperation.bobbin_id,
        looper_id: currentSubOperation.looper_id,
        created_by: req.user.userId,
      },
      { transaction: t },
    );

    /* ------------------------------------ */
    /* 3) UPDATE SUB OPERATION */
    /* ------------------------------------ */
    await SubOperation.update(
      {
        sub_operation_name,
        smv: smv ? parseFloat(smv) : null,
        remark: remark || "-",
        sub_operation_number,
        needle_count: needle_count ? parseInt(needle_count) : null,
        spi: spi ? parseInt(spi) : null,
        machine_type,
        needle_type_id: needle_type_id ? parseInt(needle_type_id) : null,

        // ✅ FIXED
        bobbin_id: bobbin_thread_id ? parseInt(bobbin_thread_id) : null,

        looper_id: looper_thread_id ? parseInt(looper_thread_id) : null,
      },
      {
        where: { sub_operation_id: id },
        transaction: t,
      },
    );

    /* ------------------------------------ */
    /* 4) UPDATE MACHINE MAPPING */
    /* ------------------------------------ */
    await sequelize.models.SubOperationMachine.destroy({
      where: { sub_operation_id: id },
      transaction: t,
    });

    if (machine_id) {
      await sequelize.models.SubOperationMachine.create(
        {
          sub_operation_id: id,
          machine_id: parseInt(machine_id),
        },
        { transaction: t },
      );
    }

    /* ------------------------------------ */
    /* 5) DELETE OLD NEEDLES */
    /* ------------------------------------ */
    await OpNeedles.destroy({
      where: { sub_operation_id: id },
      transaction: t,
    });

    /* ------------------------------------ */
    /* 6) INSERT NEEDLE 1 */
    /* ------------------------------------ */
    if (needle_type_id && needle1_thread_id) {
      await OpNeedles.create(
        {
          sub_operation_id: id,
          needle_type_id: parseInt(needle_type_id),
          thread_id: parseInt(needle1_thread_id),
          description: "Needle 1",
        },
        { transaction: t },
      );
    }

    /* ------------------------------------ */
    /* 7) INSERT NEEDLE 2 (OPTIONAL) */
    /* ------------------------------------ */
    if (needle2_thread_id) {
      await OpNeedles.create(
        {
          sub_operation_id: id,
          needle_type_id: parseInt(needle_type_id),
          thread_id: parseInt(needle2_thread_id),
          description: "Needle 2",
        },
        { transaction: t },
      );
    }

    /* ------------------------------------ */
    /* 8) COMMIT */
    /* ------------------------------------ */
    await t.commit();

    /* ------------------------------------ */
    /* 9) RETURN UPDATED RECORD */
    /* ------------------------------------ */
    const updatedSubOperation = await SubOperation.findByPk(id, {
      include: [
        { model: Machine, as: "machines" },
        { model: OpNeedles, as: "needles" },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "SubOperation updated successfully",
      data: updatedSubOperation,
    });
  } catch (error) {
    if (t && !t.finished) await t.rollback();

    console.error("Update Sub Operation Error:", error);

    return res.status(500).json({
      success: false,
      message: "Update failed",
      error: error.message,
    });
  }
};

// to delete operation
exports.deleteOperation = async (req, res, next) => {
  if (req?.user?.userRole !== "Admin" && req?.user?.userRole !== "SuperAdmin") {
    const error = new Error("You don't have permission to perform this action");
    error.status = 401;
    throw error;
  }
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
          // console.log("sub operation id ======================= ", subId);
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
            { where: { subOperationId: subId }, transaction: t },
          );
        }),
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
  let t;

  // Check permissions
  if (req?.user?.userRole !== "Admin" && req?.user?.userRole !== "SuperAdmin") {
    const error = new Error("You don't have permission to perform this action");
    error.status = 401;
    throw error;
  }

  try {
    t = await sequelize.transaction();

    // 1. FIRST: Get the sub-operation data BEFORE deletion (for logging)
    const subOperationToDelete = await SubOperation.findByPk(subOpId, {
      transaction: t,
      include: [
        {
          model: Machine,
          as: "machines",
          through: { attributes: [] },
        },
      ],
    });

    if (!subOperationToDelete) {
      await t.rollback();
      return res.status(404).json({
        status: "error",
        message: "Sub-operation not found",
      });
    }

    // 2. LOG: Insert data into log table BEFORE deleting
    await SubOperationLog.create(
      {
        sub_operation_id: subOperationToDelete.sub_operation_id,
        main_operation_id: subOperationToDelete.main_operation_id,
        thread_id: subOperationToDelete.thread_id,
        sub_operation_number: subOperationToDelete.sub_operation_number,
        sub_operation_name: subOperationToDelete.sub_operation_name,
        performed_action: "Delete",
        smv: subOperationToDelete.smv,
        remark: subOperationToDelete.remark,
        needle_count: subOperationToDelete.needle_count,
        machine_type: subOperationToDelete.machine_type,
        spi: subOperationToDelete.spi,
        needle_type_id: subOperationToDelete.needle_type_id,
        looper_id: subOperationToDelete.looper_id,
        created_by: req.user.userId,
      },
      { transaction: t },
    );

    // 3. THEN: Delete related records
    await NeedleLooper.destroy({
      where: { sub_operation_id: subOpId },
      transaction: t,
    });

    await NeedleTread.destroy({
      where: { sub_operation_id: subOpId },
      transaction: t,
    });

    // Get modified user info before creating notifications
    const modifiedUser = await User.findByPk(req.user.userId, {
      include: [{ model: Department, as: "department" }],
      transaction: t,
    });

    // Create notification message
    const message =
      subOperationToDelete.sub_operation_name +
      " has been deleted by user " +
      modifiedUser.user_name +
      `(${modifiedUser.department.department_name})`;

    // Find SuperAdmin category to get all SuperAdmin users
    const superAdminCategory = await UserCategory.findOne({
      where: { category_name: "SuperAdmin" },
      attributes: ["category_id"],
      transaction: t,
    });

    let notificationsSent = 0;
    if (superAdminCategory) {
      // Find all users with SuperAdmin category
      const superAdminUsers = await User.findAll({
        where: { user_category: superAdminCategory.category_id },
        attributes: ["user_id"],
        transaction: t,
      });

      // Create notifications for all SuperAdmin users
      if (superAdminUsers.length > 0) {
        const notificationPromises = superAdminUsers.map((user) =>
          Notification.create(
            {
              user_id: user.user_id,
              title: "Operation Delete Alert",
              operation_id: subOperationToDelete.sub_operation_id,
              message: message,
              type: "ALERT",
            },
            { transaction: t },
          ),
        );

        await Promise.all(notificationPromises);
        notificationsSent = superAdminUsers.length;
        console.log(
          `Delete notifications sent to ${superAdminUsers.length} SuperAdmin users`,
        );
      } else {
        console.log("No SuperAdmin users found to send delete notifications");
      }
    } else {
      console.log("SuperAdmin category not found for delete notification");
    }

    // Delete machine associations
    await sequelize.models.SubOperationMachine.destroy({
      where: { sub_operation_id: subOpId },
      transaction: t,
    });

    // 4. FINALLY: Delete the main sub-operation record
    await SubOperation.destroy({
      where: { sub_operation_id: subOpId },
      transaction: t,
    });

    await t.commit();

    console.log("modified user: ", modifiedUser);
    console.log("Sub operation delete success with logging");

    res.status(200).json({
      status: "success",
      message: "Sub-operation deleted successfully",
      log_created: true,
      notifications_sent: notificationsSent,
    });
  } catch (error) {
    // Only rollback if transaction exists and hasn't been committed
    if (t && !t.finished) {
      await t.rollback();
    }

    console.error("Delete failed:", error);

    // Better error handling
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        status: "error",
        message:
          "Cannot delete sub-operation. It is referenced by other records.",
      });
    }

    // Handle other errors
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ====================================
// create helper operations
// ====================================
exports.createHelperOps = async (req, res, next) => {
  // console.log(req.body);

  if (req?.user?.userRole !== "Admin" && req?.user?.userRole !== "SuperAdmin") {
    const error = new Error("You don't have permission to perform this action");
    error.status = 401;
    throw error;
  }

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
        "The requested style is not existing in style data table",
      );
      error.status = 403;
      // console.log("requested style cannot find in style data table");
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
    // console.log("Helper operation create success....");
    res.status(201).json({
      status: "success",
      message: "Helper operation creation success",
    });
  } catch (error) {
    // console.log(error);
    return next(error);
  }
};

/**
 * Process uploaded Excel file and extract operations
 */
((exports.processExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded. Please select an Excel file.",
      });
    }

    // console.log(`📁 Processing uploaded file: ${req.file.originalname}`);

    // Process the Excel file using our utility function
    const result = await processExcelFile(req.file.path);

    // Clean up: delete the uploaded file after processing
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        // console.log(`✅ Temporary file cleaned up: ${req.file.path}`);
      }
    } catch (cleanupError) {
      console.warn("⚠️ Could not delete temporary file:", cleanupError.message);
    }

    if (result.success) {
      return res.json({
        success: true,
        data: result.data.operations, // Maintain backward compatibility
        styleId: result.data.styleId, // Send style ID separately
        message: result.message,
        summary: {
          totalMainOperations: result.data.operations.length,
          totalSubOperations: result.data.operations.reduce(
            (sum, op) => sum + op.SubOperations.length,
            0,
          ),
          styleId: result.data.styleId, // Include in summary too
          fileName: req.file.originalname,
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
        fileName: req.file.originalname,
      });
    }
  } catch (error) {
    console.error("❌ Controller error:", error);

    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn(
          "⚠️ Could not delete temporary file on error:",
          cleanupError.message,
        );
      }
    }

    return res.status(500).json({
      success: false,
      error: "Internal server error while processing Excel file",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}),
  (exports.healthCheck = (req, res) => {
    res.json({
      success: true,
      service: "Excel Operations Processor",
      status: "Operational",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    });
  }),
  /**
   * Health check endpoint for Excel processing service
   */

  /**
   * Get supported file formats
   */
  (exports.getSupportedFormats = (req, res) => {
    res.json({
      success: true,
      supportedFormats: {
        extensions: [".xlsx", ".xls"],
        mimeTypes: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ],
        maxSize: "10MB",
      },
    });
  }));

exports.saveOperations = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { styleId } = req.params;
    const styleNo = styleId.startsWith(":") ? styleId.slice(1) : styleId;
    const { operations, selectionStats } = req.body;

    const style = await Style.findOne({
      where: { style_no: styleNo },
      transaction,
    });

    if (!style) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: `We couldn’t find style number "${styleNo}". Please add the style first, then add operations.`,
      });
    }

    const DEFAULT_OPERATION_TYPE_ID = 1; // normal / finishing
    const HELPER_OPERATION_TYPE_ID = 2;

    const savedMainOperations = [];
    const savedSubOperations = [];
    const savedHelpers = [];
    const skippedOperations = [];

    // Helper detectors
    const isFinishingOperation = (opNo) => /^F\d+/i.test(opNo);
    const isHelperOperation = (opNo) => /^H\d+/i.test(opNo);
    const isNumericSubOperation = (opNo) => /^\d+$/i.test(opNo);

    for (const operationData of operations) {
      const {
        MainOperation: operationName,
        required,
        SubOperations,
      } = operationData;

      if (required === "false") continue;

      // ============================
      // CREATE / SKIP MAIN OPERATION
      // ============================
      let mainOperation = await MainOperation.findOne({
        where: {
          style_no: style.style_id,
          operation_name: operationName,
        },
        transaction,
      });

      if (!mainOperation) {
        mainOperation = await MainOperation.create(
          {
            style_no: style.style_id,
            operation_type_id: 1,
            operation_name: operationName,
          },
          { transaction },
        );
        savedMainOperations.push(mainOperation);
      }

      // ============================
      // PROCESS SUB OPERATIONS
      // ============================
      if (!Array.isArray(SubOperations)) continue;

      for (const subOpData of SubOperations) {
        const {
          OperationNo: subOperationNumber,
          Operation: subOperationName,
          "M/C Type": machineType,
          "MC SMV": smv,
          required: subRequired,
        } = subOpData;

        if (subRequired === "false") continue;

        // ============================
        // HELPER OPERATION (H*)
        // ============================
        if (isHelperOperation(subOperationNumber)) {
          const existingHelper = await Helper.findOne({
            where: {
              style_id: style.style_id,
              operation_code: subOperationNumber,
            },
            transaction,
          });

          if (existingHelper) {
            skippedOperations.push(
              `Helper: ${subOperationName} (${subOperationNumber})`,
            );
            continue;
          }

          const helper = await Helper.create(
            {
              style_id: style.style_id,
              operation_type_id: HELPER_OPERATION_TYPE_ID,
              operation_code: subOperationNumber,
              operation_name: subOperationName,
              mc_type: machineType,
              mc_smv: smv ? smv.toString() : null,
              comments: null,
            },
            { transaction },
          );

          savedHelpers.push(helper);
          continue; // ⛔ no main operation involvement
        }

        // ============================
        // FINISHING OPERATION (F*)
        // ============================
        let targetMainOperation = mainOperation;

        if (isFinishingOperation(subOperationNumber)) {
          const [finishingMainOp] = await MainOperation.findOrCreate({
            where: {
              style_no: style.style_id,
              operation_name: "FINISHING",
            },
            defaults: {
              style_no: style.style_id,
              operation_type_id: DEFAULT_OPERATION_TYPE_ID,
              operation_name: "FINISHING",
            },
            transaction,
          });

          targetMainOperation = finishingMainOp;
        }

        // ============================
        // NORMAL SUB OPERATION (123 / F*)
        // ============================
        if (
          isNumericSubOperation(subOperationNumber) ||
          isFinishingOperation(subOperationNumber)
        ) {
          const existingSubOperation = await SubOperation.findOne({
            where: {
              main_operation_id: targetMainOperation.operation_id,
              sub_operation_number: subOperationNumber,
              sub_operation_name: subOperationName,
            },
            transaction,
          });

          if (existingSubOperation) {
            skippedOperations.push(
              `Sub: ${subOperationName} (${subOperationNumber})`,
            );
            continue;
          }

          const subOperation = await SubOperation.create(
            {
              main_operation_id: targetMainOperation.operation_id,
              sub_operation_number: subOperationNumber,
              sub_operation_name: subOperationName,
              smv: smv || null,
              machine_type: `${machineType}`,
              needle_count: null,
            },
            { transaction },
          );

          savedSubOperations.push(subOperation);
        }
      }
    }

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: `Successfully saved operations for style ${styleNo}`,
      data: {
        style: style.style_no,
        mainOperationsCount: savedMainOperations.length,
        subOperationsCount: savedSubOperations.length,
        helperOperationsCount: savedHelpers.length,
        skippedOperationsCount: skippedOperations.length,
        summary: selectionStats,
        duplicatesSkipped: skippedOperations,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error saving operations:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to save operations to database",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.addTechnicalData = async (req, res, next) => {
  try {
    // Accept both naming conventions
    const subOperationId = req.body.sub_operation_id || req.body.subOperationId;

    // Accept both naming conventions for technical fields
    const cuttableWidth = req.body.cuttable_width || req.body.cuttableWidth;
    const folderType = req.body.folder_type || req.body.folderType;
    const finishWidth = req.body.finish_width || req.body.finishWidth;
    const needleGauge = req.body.needle_gauge || req.body.needleGauge;
    const createdBy = req.body.created_by || req.body.created_by;

    if (!subOperationId) {
      return res.status(400).json({
        success: false,
        message: "Sub-operation ID is required",
      });
    }

    const subOperation = await SubOperation.findByPk(subOperationId);
    if (!subOperation) {
      return res.status(404).json({
        success: false,
        message: "Sub-operation not found",
      });
    }

    // Update only technical data fields
    const updateData = {
      cuttable_width: cuttableWidth !== undefined ? cuttableWidth : null,
      folder_type: folderType !== undefined ? folderType : null,
      finish_width: finishWidth !== undefined ? finishWidth : null,
      needle_gauge: needleGauge !== undefined ? needleGauge : null,
    };

    if (createdBy) {
      updateData.created_by = createdBy;
    }

    await subOperation.update(updateData);

    return res.status(200).json({
      success: true,
      message: "Technical data updated successfully",
      data: subOperation,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update technical data",
      error: error.message,
    });
  }
};

// to get technical data
exports.getTechnicalData = async (req, res, next) => {
  const { subOperationId } = req.params;
  try {
    if (!subOperationId) {
      const error = new Error("Sub operation id is empty");
      error.status = 400;
      throw error;
    }

    const subOperation = await SubOperation.findByPk(subOperationId, {
      attributes: [
        "sub_operation_id",
        "cuttable_width",
        "folder_type",
        "finish_width",
        "needle_gauge",
        "createdAt",
        "updatedAt",
      ],
    });

    if (!subOperation) {
      const error = new Error("Sub operation cannot be found");
      error.status = 404;
      throw error;
    }

    res.status(200).json({ data: subOperation });
  } catch (error) {
    console.error(error);
    return;
  }
};

// to generate technical data sheet
exports.generateDataSheet = async (req, res, next) => {
  console.log("generating technical sheet");

  try {
    //! create workbook and sheet
    const workBook = new ExcelJs.Workbook();
    const sheet = workBook.addWorksheet("Technical Sheet");

    // ============= ROW 1: CONSTRUCTION DETAILS =============
    sheet.mergeCells("A1:Q1");
    const constructionCell = sheet.getCell("A1");
    constructionCell.value = "CONSTRUCTION DETAILS";
    constructionCell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    constructionCell.font = {
      bold: true,
      size: 16,
      color: { argb: "FFFFFFFF" },
    };
    constructionCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF002060" }, // Dark blue
    };

    // fetch data from db
    const style = await Style.findByPk(23, {
      include: [
        {
          model: MainOperation,
          as: "operations",
          required: true,
          include: [
            {
              model: SubOperation,
              as: "subOperations",
              include: [
                {
                  model: Machine,
                  as: "machines",
                  through: { attributes: [] },
                },
                {
                  model: NeedleTypeN,
                  as: "needle_type",
                },
                {
                  model: NeedleLooper,
                  as: "needle_loopers",
                },
                {
                  model: Thread,
                  as: "thread",
                  attributes: [
                    "thread_id",
                    "thread_category",
                    "description",
                    "status",
                  ],
                },
              ],
            },
          ],
        },
        {
          model: StyleMedia,
          as: "style_medias",
        },
      ],
    });

    if (!style) {
      return res.status(404).json({ error: "Style not found" });
    }

    // ============= ROW 2: Buyer line =============
    const row2 = sheet.getRow(2);

    // A2: "Buyer"
    sheet.getCell("B2").value = "Buyer";
    sheet.getCell("B2").font = { bold: true };

    // C2: Customer name from style data
    sheet.mergeCells("C2:E2");
    sheet.getCell("C2").value = style.customer?.customer_name || "N/A";
    sheet.getCell("C2").alignment = { horizontal: "left" };

    // F2: "Sample Referred"
    sheet.getCell("F2").value = "Sample Referred";
    sheet.getCell("F2").font = { bold: true };

    // G2: "0"
    sheet.getCell("G2").value = "0";

    // H2: "CONFIRMED"
    sheet.getCell("H2").value = "CONFIRMED";
    sheet.getCell("H2").font = { bold: true };
    sheet.getCell("H2").alignment = { horizontal: "center" };

    // I2: Empty
    sheet.getCell("I2").value = "";

    // J2: "RT"
    sheet.mergeCells("J2:K2");
    sheet.getCell("J2").value = "RT";
    sheet.getCell("J2").alignment = { horizontal: "center" };

    // N2: "SIGNATURE"
    sheet.getCell("N2").value = "SIGNATURE";
    sheet.getCell("N2").font = { bold: true };
    sheet.getCell("N2").alignment = { horizontal: "center" };

    // O2: "TECHNICAL"
    sheet.mergeCells("O2:Q2");
    sheet.getCell("O2").value = "TECHNICAL";
    sheet.getCell("O2").font = { bold: true };
    sheet.getCell("O2").alignment = { horizontal: "center" };

    // ============= ROW 3: Date line =============
    const row3 = sheet.getRow(3);

    // A3: "Date"
    sheet.getCell("B3").value = "Date";
    sheet.getCell("B3").font = { bold: true };

    // C3: Current date
    sheet.mergeCells("C3:E3");
    sheet.getCell("C3").value = new Date().toLocaleString();
    sheet.getCell("C3").alignment = { horizontal: "left" };

    // F3: "Size"
    sheet.getCell("F3").value = "Size";
    sheet.getCell("F3").font = { bold: true };

    // G3: "0"
    sheet.getCell("G3").value = "0";

    // O3: "TECHNICAL"
    sheet.mergeCells("O3:Q3");
    sheet.getCell("O3").value = "TECHNICAL";
    sheet.getCell("O3").font = { bold: true };
    sheet.getCell("O3").alignment = { horizontal: "center" };

    // ============= ROW 4: Style No line =============
    const row4 = sheet.getRow(4);

    // A4: "Style No"
    sheet.getCell("B4").value = "Style No";
    sheet.getCell("B4").font = { bold: true };

    // C4: Style number from database
    sheet.mergeCells("C4:E4");
    sheet.getCell("C4").value = style.style_no || "N/A";
    sheet.getCell("C4").alignment = { horizontal: "left" };

    // F4: "Order Quantity"
    sheet.getCell("F4").value = "Order Quantity";
    sheet.getCell("F4").font = { bold: true };

    // G4: "0"
    sheet.getCell("G4").value = "0";

    // ============= ROW 5: Description line =============
    const row5 = sheet.getRow(5);

    // A5: "Description"
    sheet.getCell("B5").value = "Description";
    sheet.getCell("B5").font = { bold: true };

    // C5: Style description from database
    sheet.mergeCells("C5:E5");
    sheet.getCell("C5").value =
      style.style_description || style.style_name || "N/A";
    sheet.getCell("C5").alignment = { horizontal: "left" };

    // F5: "Production Factory"
    sheet.getCell("F5").value = "Production Factory";
    sheet.getCell("F5").font = { bold: true };

    // G5: Factory name from database
    sheet.getCell("G5").value = style.factory?.factory_name || "N/A";

    // O5: "TECHNICAL"
    sheet.mergeCells("O5:Q5");
    sheet.getCell("O5").value = "TECHNICAL";
    sheet.getCell("O5").font = { bold: true };
    sheet.getCell("O5").alignment = { horizontal: "center" };

    // ============= ROW 6: Was/dye line =============
    const row6 = sheet.getRow(6);

    // A6: "Was/dye"
    sheet.getCell("B6").value = "Was/dye";
    sheet.getCell("B6").font = { bold: true };

    // C6: "NO WASH"
    sheet.mergeCells("C6:E6");
    sheet.getCell("C6").value = "NO WASH";
    sheet.getCell("C6").alignment = { horizontal: "left" };

    // F6: "Machines/Line"
    sheet.getCell("F6").value = "Machines/Line";
    sheet.getCell("F6").font = { bold: true };

    // G6: "0"
    sheet.getCell("G6").value = "0";

    // ============= ROW 7: Fabric line =============
    const row7 = sheet.getRow(7);

    // A7: "Fabric"
    sheet.getCell("B7").value = "Fabric";
    sheet.getCell("B7").font = { bold: true };

    // C7: "FLEECE"
    sheet.mergeCells("C7:E7");
    sheet.getCell("C7").value = "FLEECE";
    sheet.getCell("C7").alignment = { horizontal: "left" };

    // F7: "Efficiency"
    sheet.getCell("F7").value = "Efficiency";
    sheet.getCell("F7").font = { bold: true };

    // G7: "0"
    sheet.getCell("G7").value = "0";

    // ============= ROW 8: Discussed with line =============
    const row8 = sheet.getRow(8);

    // A8: "Discussed with"
    sheet.getCell("B8").value = "Discussed with";
    sheet.getCell("B8").font = { bold: true };

    // N8: "END LINE"
    sheet.getCell("N8").value = "END LINE";
    sheet.getCell("N8").font = { bold: true };
    sheet.getCell("N8").alignment = { horizontal: "center" };

    // O8: "PRESSING"
    sheet.getCell("O8").value = "PRESSING";
    sheet.getCell("O8").font = { bold: true };
    sheet.getCell("O8").alignment = { horizontal: "center" };

    // P8: "Not Required"
    sheet.mergeCells("P8:Q8");
    sheet.getCell("P8").value = "Not Required";
    sheet.getCell("P8").alignment = { horizontal: "center" };

    // ============= ROW 9: Column headers =============
    const row9 = sheet.getRow(9);

    // A9: Empty
    sheet.getCell("B9").value = "";

    // B9: "Folder"
    sheet.getCell("B9").value = "Folder";
    sheet.getCell("B9").font = { bold: true };
    sheet.getCell("B9").alignment = { horizontal: "center" };

    // C9: Empty

    // D9: "Needles"
    sheet.getCell("D9").value = "Needles";
    sheet.getCell("D9").font = { bold: true };
    sheet.getCell("D9").alignment = { horizontal: "center" };

    // E9: Empty

    // F9: "Sewing"
    sheet.getCell("F9").value = "Sewing";
    sheet.getCell("F9").font = { bold: true };
    sheet.getCell("F9").alignment = { horizontal: "center" };

    // G9: Empty

    // H9: "Thread"
    sheet.getCell("H9").value = "Thread";
    sheet.getCell("H9").font = { bold: true };
    sheet.getCell("H9").alignment = { horizontal: "center" };

    // I9: Empty

    // J9: "Comments"
    sheet.mergeCells("J9:Q9");
    sheet.getCell("J9").value = "Comments";
    sheet.getCell("J9").font = { bold: true };
    sheet.getCell("J9").alignment = { horizontal: "center" };

    // ============= ROW 10: Sub-headers =============
    const row10 = sheet.getRow(10);

    // A10: "NO"
    sheet.getCell("A10").value = "NO";
    sheet.getCell("A10").font = { bold: true };
    sheet.getCell("A10").alignment = { horizontal: "center" };

    // B10: "Operation"
    sheet.getCell("B10").value = "Operation";
    sheet.getCell("B10").font = { bold: true };
    sheet.getCell("B10").alignment = { horizontal: "center" };

    // C10: "Machine"
    sheet.getCell("C10").value = "Machine";
    sheet.getCell("C10").font = { bold: true };
    sheet.getCell("C10").alignment = { horizontal: "center" };

    // D10: "Finish width\n/ Raw / Cover" (multiline)
    sheet.getCell("D10").value = "Finish width\n/ Raw / Cover";
    sheet.getCell("D10").font = { bold: true };
    sheet.getCell("D10").alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };

    // E10: "Folder Type"
    sheet.getCell("E10").value = "Folder Type";
    sheet.getCell("E10").font = { bold: true };
    sheet.getCell("E10").alignment = { horizontal: "center" };

    // F10: "Folder Cuttable Width"
    sheet.getCell("F10").value = "Folder Cuttable Width";
    sheet.getCell("F10").font = { bold: true };
    sheet.getCell("F10").alignment = { horizontal: "center" };

    // G10: "Needle Gauge"
    sheet.getCell("G10").value = "Needle Gauge";
    sheet.getCell("G10").font = { bold: true };
    sheet.getCell("G10").alignment = { horizontal: "center" };

    // H10: "Spreader\n(Yes / No)" (multiline)
    sheet.getCell("H10").value = "Spreader\n(Yes / No)";
    sheet.getCell("H10").font = { bold: true };
    sheet.getCell("H10").alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };

    // I10: "No of Needles"
    sheet.getCell("I10").value = "No of Needles";
    sheet.getCell("I10").font = { bold: true };
    sheet.getCell("I10").alignment = { horizontal: "center" };

    // J10: "Needle (Type/Color)"
    sheet.getCell("J10").value = "Needle (Type/Color)";
    sheet.getCell("J10").font = { bold: true };
    sheet.getCell("J10").alignment = { horizontal: "center" };

    // K10: "Sewing Allowance"
    sheet.getCell("K10").value = "Sewing Allowance";
    sheet.getCell("K10").font = { bold: true };
    sheet.getCell("K10").alignment = { horizontal: "center" };

    // L10: "Cutting Allowance"
    sheet.getCell("L10").value = "Cutting Allowance";
    sheet.getCell("L10").font = { bold: true };
    sheet.getCell("L10").alignment = { horizontal: "center" };

    // M10: "SPI"
    sheet.getCell("M10").value = "SPI";
    sheet.getCell("M10").font = { bold: true };
    sheet.getCell("M10").alignment = { horizontal: "center" };

    // N10: "Needle (Type/Color)"
    sheet.getCell("N10").value = "Needle (Type/Color)";
    sheet.getCell("N10").font = { bold: true };
    sheet.getCell("N10").alignment = { horizontal: "center" };

    // O10: "Spread (Type/Color)"
    sheet.getCell("O10").value = "Spread (Type/Color)";
    sheet.getCell("O10").font = { bold: true };
    sheet.getCell("O10").alignment = { horizontal: "center" };

    // P10: "looper (Type/Color)"
    sheet.getCell("P10").value = "looper (Type/Color)";
    sheet.getCell("P10").font = { bold: true };
    sheet.getCell("P10").alignment = { horizontal: "center" };

    // Q10: Empty
    sheet.getCell("Q10").value = "";

    // ============= Set column widths =============
    sheet.columns = [
      { width: 5 }, // A
      { width: 35 }, // B
      { width: 20 }, // C
      { width: 12 }, // D
      { width: 12 }, // E
      { width: 20 }, // F
      { width: 12 }, // G
      { width: 10 }, // H
      { width: 12 }, // I
      { width: 12 }, // J
      { width: 12 }, // K
      { width: 12 }, // L
      { width: 8 }, // M
      { width: 12 }, // N
      { width: 12 }, // O
      { width: 12 }, // P
      { width: 12 }, // Q
    ];

    // Add borders to header rows (10)
    const headerRow = sheet.getRow(10);
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // ============= POPULATE DATA ROWS =============
    let currentRow = 11; // Start after header row (row 10)
    let operationNumber = 1;

    // Iterate through main operations
    if (style.operations && style.operations.length > 0) {
      for (const mainOperation of style.operations) {
        // ============= ROW 1: Main Operation Only =============
        const mainOpRow = sheet.getRow(currentRow);

        // Column A: NO
        mainOpRow.getCell(1).value = operationNumber++;

        // Column B: Main Operation Name (bold for emphasis)
        mainOpRow.getCell(2).value = mainOperation.operation_name;
        mainOpRow.getCell(2).font = { bold: true };

        // Add background color to highlight main operation row
        mainOpRow.eachCell((cell) => {
          // cell.fill = {
          //   type: "pattern",
          //   pattern: "solid",
          //   fgColor: { argb: "FFF2F2F2" }, // Light gray background
          // };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });

        currentRow++;

        // ============= SUB-OPERATION ROWS =============
        if (
          mainOperation.subOperations &&
          mainOperation.subOperations.length > 0
        ) {
          for (const subOperation of mainOperation.subOperations) {
            const subOpRow = sheet.getRow(currentRow);

            // Column A: Leave empty for sub-operation (no number)
            subOpRow.getCell(1).value = "";

            // Column B: Sub-operation name (indented with 2 spaces)
            subOpRow.getCell(2).value =
              `  ${subOperation.sub_operation_name || ""}`;

            // Column C: Machine (first machine name)
            if (subOperation.machines && subOperation.machines.length > 0) {
              subOpRow.getCell(3).value =
                subOperation.machines[0].machine_name ||
                subOperation.machines[0].machine_type ||
                "N/A";
            } else if (subOperation.machine_type) {
              subOpRow.getCell(3).value = subOperation.machine_type;
            }

            // Column D: Finish width / Raw / Cover
            subOpRow.getCell(4).value = subOperation.finish_width || "N/A";

            // Column E: Folder Type
            subOpRow.getCell(5).value = subOperation.folder_type || "N/A";

            // Column F: Folder Cuttable Width
            subOpRow.getCell(6).value = subOperation.cuttable_width || "N/A";

            // Column G: Needle Gauge
            subOpRow.getCell(7).value = subOperation.needle_gauge || "N/A";

            // Column H: Spreader (Yes/No)
            subOpRow.getCell(8).value = "No"; // Default value, update based on your data

            // Column I: No of Needles
            subOpRow.getCell(9).value = subOperation.needle_count || "N/A";

            // Column J: Needle (Type/Color) - From NeedleTypeN
            if (subOperation.needle_type) {
              subOpRow.getCell(10).value =
                `${subOperation.needle_type.needle_type || ""}/${subOperation.needle_type.color || ""}`.trim();
            }

            // Column K: Sewing Allowance
            subOpRow.getCell(11).value = "N/A"; // Add this field to your model if needed

            // Column L: Cutting Allowance
            subOpRow.getCell(12).value = "N/A"; // Add this field to your model if needed

            // Column M: SPI
            subOpRow.getCell(13).value = subOperation.spi || "N/A";

            // Column N: Needle (Type/Color) - From thread
            if (subOperation.thread) {
              subOpRow.getCell(14).value =
                `${subOperation.thread.thread_category || ""}/${subOperation.thread.description || ""}`.trim();
            }

            // Column O: Spread (Type/Color) - From needle_loopers
            if (
              subOperation.needle_loopers &&
              subOperation.needle_loopers.length > 0
            ) {
              const looper = subOperation.needle_loopers[0];
              subOpRow.getCell(15).value =
                `${looper.type || ""}/${looper.color || ""}`.trim();
            }

            // Column P: looper (Type/Color) - From looper thread
            if (subOperation.looper_id && subOperation.looper) {
              subOpRow.getCell(16).value =
                `${subOperation.looper.thread_category || ""}/${subOperation.looper.description || ""}`.trim();
            }

            // Column Q: Comments (from remark)
            subOpRow.getCell(17).value = subOperation.remark || "";

            // Add borders to sub-operation row
            subOpRow.eachCell((cell) => {
              cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
              };
            });

            currentRow++;
          }
        } else {
          // If no sub-operations, still leave an empty row under main operation for spacing
          const emptyRow = sheet.getRow(currentRow);
          emptyRow.eachCell((cell) => {
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          });
          currentRow++;
        }
      }
    }

    // Auto-fit rows for better visibility
    for (let i = 11; i < currentRow; i++) {
      sheet.getRow(i).alignment = { vertical: "middle", wrapText: true };
    }

    // ============= Send the file =============
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="technical-data-${style.style_no || "sheet"}.xlsx"`,
    );

    await workBook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel sheet:", error);
    res.status(500).json({
      error: "Failed to generate Excel sheet",
      details: error.message,
    });
  }
};

// Optional: Helper function for machine associations
async function handleMachineAssociations(
  subOperation,
  machineType,
  transaction,
) {
  try {
    // Find machine by type or create if it doesn't exist
    let machine = await Machine.findOne({
      where: { machine_type: machineType },
      transaction,
    });

    if (!machine) {
      // Create new machine if it doesn't exist
      machine = await Machine.create(
        {
          machine_type: machineType,
          machine_name: machineType,
          // Add other required machine fields here
        },
        { transaction },
      );
    }

    // Create association in the join table
    await SubOperationMachine.create(
      {
        sub_operation_id: subOperation.sub_operation_id,
        machine_id: machine.machine_id,
      },
      { transaction },
    );

    // console.log(
    //   `Associated machine ${machineType} with sub-operation ${subOperation.sub_operation_id}`
    // );
  } catch (machineError) {
    console.error(
      `Error handling machine associations for ${machineType}:`,
      machineError,
    );
    // Don't throw - we don't want machine association errors to stop the entire process
  }
}
