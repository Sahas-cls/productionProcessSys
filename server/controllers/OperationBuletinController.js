// to create new operation
const { where } = require("sequelize");
const { processExcelFile } = require("../utils/excelProcessor");
const { sequelize } = require("../models");
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
                  model: OpNeedles,
                  as: "needles",

                  include: [
                    {
                      model: NeedleTypeN,
                      as: "needle_type",
                    },
                    {
                      model: Thread,
                      as: "bottom",
                    },
                    {
                      model: Thread,
                      as: "looper",
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

      // OLD single needle
      needle_type_id,

      // NEW MULTI NEEDLE FIELDS
      needle_type_id1,
      thread_id1,
      needle_type_id2,
      thread_id2,
    } = req.body;

    if (!id || !sub_operation_name) {
      await t.rollback();
      return res.status(400).json({
        error: "SubOperation ID and name are required",
      });
    }

    /* ---------------------------------------------------
       1) FIND CURRENT SUB OPERATION
    --------------------------------------------------- */
    const currentSubOperation = await SubOperation.findByPk(id, {
      transaction: t,
      include: [{ model: Machine, as: "machines" }],
    });

    if (!currentSubOperation) {
      await t.rollback();
      return res.status(404).json({ error: "SubOperation not found" });
    }

    /* ---------------------------------------------------
       2) LOG OLD DATA
    --------------------------------------------------- */
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
        created_by: req.user.userId,
      },
      { transaction: t },
    );

    /* ---------------------------------------------------
       3) UPDATE SUB OPERATION TABLE
    --------------------------------------------------- */
    await SubOperation.update(
      {
        sub_operation_name,
        smv: smv ? parseFloat(smv) : null,
        remark: remark || "-",
        sub_operation_number,
        needle_count: needle_count ? parseFloat(needle_count) : null,
        spi: spi ? parseFloat(spi) : null,
        machine_type,
        needle_type_id: needle_type_id ? parseInt(needle_type_id) : null,
      },
      {
        where: { sub_operation_id: id },
        transaction: t,
      },
    );

    /* ---------------------------------------------------
       4) UPDATE MACHINE MAPPING
    --------------------------------------------------- */
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

    /* ---------------------------------------------------
       5) DELETE OLD NEEDLES
    --------------------------------------------------- */
    await OpNeedles.destroy({
      where: { sub_operation_id: id },
      transaction: t,
    });

    /* ---------------------------------------------------
       6) INSERT NEEDLE ROW #1
    --------------------------------------------------- */
    if (needle_type_id1 && thread_id1) {
      await OpNeedles.create(
        {
          sub_operation_id: id,
          needle_type_id: parseInt(needle_type_id1),
          bottom_id: parseInt(thread_id1), // using bottom_id column
          looper_id: null,
          description: "Needle 1",
        },
        { transaction: t },
      );
    }

    /* ---------------------------------------------------
       7) INSERT NEEDLE ROW #2
    --------------------------------------------------- */
    if (needle_type_id2 && thread_id2) {
      await OpNeedles.create(
        {
          sub_operation_id: id,
          needle_type_id: parseInt(needle_type_id2),
          bottom_id: null,
          looper_id: parseInt(thread_id2),
          description: "Needle 2",
        },
        { transaction: t },
      );
    }

    /* ---------------------------------------------------
       8) COMMIT
    --------------------------------------------------- */
    await t.commit();

    /* ---------------------------------------------------
       9) RETURN UPDATED DATA
    --------------------------------------------------- */
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

    console.error(error);

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
