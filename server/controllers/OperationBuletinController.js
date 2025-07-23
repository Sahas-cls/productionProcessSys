// to create new operation
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
              as: "machine",
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
          as: "style", // only if you've set alias in association
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
  console.log("controller called");
  console.log(req.body);
  //   return res.status(200);
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
      // find does requesting style exist or not
      const styleExist = await Style.findOne({
        where: {
          style_no: styleNumber,
        },
      });

      if (!styleExist) {
        console.error("style cannot be found in database");
        const error = new Error("Provided style does not exist");
        error.status = 400;
        throw error;
      }
      // create main operation
      const createNewOP = await MainOperation.create({
        style_no: styleExist.style_id,
        operation_name: operationName,
      });

      // create sub operation
      const createSubOP = await SubOperation.create({
        main_operation_id: createNewOP.operation_id,
        sub_operation_name: operationName,
        msv: smv,
        remark: remarks,
      });

      //   create machine
      const createMachine = await Machine.create({
        sub_operation_id: createSubOP.sub_operation_id,
        machine_no: machineNo,
        machine_name: machineName,
        machine_type: machineType,
        machine_brand: machineBrand,
        machine_location: machineLocation,
        needle_count: needleCount,
      });

      //   create needletypes according to machine
      for (const needle of needleType) {
        await NeedleType.create({
          type: needle.type || null,
          machine_id: createMachine.machine_id,
        });
      }
      //   create needle tread according to machine
      for (const tread of needleTreads) {
        await NeedleTread.create({
          tread: tread,
          machine_id: createMachine.machine_id,
        });
      }
      // create needle looper accordint o machine
      for (const bobbinTreadLooper of bobbinTreadLoopers) {
        await NeedleLooper.create({
          looper_type: bobbinTreadLooper,
          machine_id: createMachine.machine_id,
        });
      }

      console.log("\x1b[32m%s\x1b[0m", "✅ Record creation success");
      console.log("main op id: ", createNewOP.operation_id);
      res.status(201).json({
        status: "success",
        message: "Operation bulletin saved successfull",
        mainOPId: createNewOP.operation_id,
      });
    });
  } catch (error) {
    console.log(error);
    next(error);
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

exports.createBulkOperations = async (req, res, next) => {
  console.log("Raw request body:", JSON.stringify(req.body, null, 2));
  // console.log(req.body);
  // return;
  try {
    const {
      styleNumber,
      mainOperation,
      operations,
      currentOPId,
      mainOperationName,
    } = req.body;

    // Validate required fields
    if (!mainOperation) {
      console.error("Main operation is missing in payload:", req.body);
      return res.status(400).json({
        error: "mainOperation is required at the top level",
      });
    }

    await sequelize.transaction(async (t) => {
      // 1. Verify style exists
      const styleExist = await Style.findOne({
        where: { style_no: styleNumber },
        transaction: t,
      });

      if (!styleExist) {
        throw new Error(`Style ${styleNumber} not found`);
      }

      // 2. Create Main Operation
      const mainOp = await MainOperation.create(
        {
          style_no: styleExist.style_id,
          operation_type_id: 1,
          operation_name: mainOperationName,
        },
        { transaction: t }
      );
      console.log("Created main operation:", mainOp.toJSON());

      // 3. Process sub-operations
      for (const op of operations) {
        // Validate sub-operation
        if (!op.operationName) {
          throw new Error("Sub-operation requires operationName");
        }

        // Create SubOperation
        const subOp = await SubOperation.create(
          {
            main_operation_id: mainOp.operation_id,
            sub_operation_name: op.operationName,
            operation_number: op.operationNumber,
            msv: op.smv,
            remark: op.remarks,
          },
          { transaction: t }
        );

        // Create Machine
        const machine = await Machine.create(
          {
            sub_operation_id: subOp.sub_operation_id,
            machine_no: op.machineNo,
            machine_name: op.machineName,
            machine_type: op.machineType,
            machine_brand: op.machineBrand,
            machine_location: op.machineLocation,
            needle_count: op.needleCount,
          },
          { transaction: t }
        );

        // Create Needle Types
        if (op.needleType && op.needleType.length > 0) {
          await Promise.all(
            op.needleType.map((needle) =>
              NeedleType.create(
                {
                  type: needle.type || null,
                  machine_id: machine.machine_id,
                },
                { transaction: t }
              )
            )
          );
        }

        // Create Needle Treads
        if (op.needleTreads && op.needleTreads.length > 0) {
          await Promise.all(
            op.needleTreads.map((tread) =>
              NeedleTread.create(
                {
                  tread: tread,
                  machine_id: machine.machine_id,
                },
                { transaction: t }
              )
            )
          );
        }

        // Create Bobbin Tread Loopers
        if (op.bobbinTreadLoopers && op.bobbinTreadLoopers.length > 0) {
          await Promise.all(
            op.bobbinTreadLoopers.map((looper) =>
              NeedleLooper.create(
                {
                  looper_type: looper,
                  machine_id: machine.machine_id,
                },
                { transaction: t }
              )
            )
          );
        }
      }

      return res.status(201).json({
        status: "success",
        mainOPId: mainOp.operation_id,
        message: `Created ${operations.length} operations`,
      });
    });
  } catch (error) {
    console.error("Bulk operation error:", error);
    next(error);
  }
};

exports.editOperation = async (req, res, next) => {};

// to delete operation
exports.deleteOperation = async (req, res, next) => {};

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
