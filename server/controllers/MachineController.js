const { where } = require("sequelize");
const {
  Sequelize,
  Machine,
  SubOperation,
  MainOperation,
  Style,
} = require("../models");
const ExcelJS = require("exceljs");
const { extractMachineDataFromExcel } = require("../utils/machineProcessor");
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");

// get machines with limit
exports.getMachineDataLimited = async (req, res, next) => {
  //
  try {
    const machineSet = await Machine.findAll({
      include: [
        {
          model: SubOperation,
          as: "sub_operations",
          include: [
            {
              model: MainOperation,
              as: "mainOperation",
              include: [{ model: Style, as: "style" }],
            },
          ],
        },
      ],
      limit: 10,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      status: "success",
      message: "Machine select success",
      data: machineSet,
    });
  } catch (error) {
    return next(error);
  }
};

// filter data - search function
exports.searchMachines = async (req, res, next) => {
  console.log("searching machines.....");
  console.log(req.params); // This should now show { searchKey: 'calfa' }

  try {
    const { searchKey } = req.params; // Get from params

    if (!searchKey || searchKey.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Search term is required",
      });
    }

    // Build search condition for multiple fields
    const whereCondition = {
      [Op.or]: [
        { machine_no: { [Op.like]: `%${searchKey}%` } },
        { machine_name: { [Op.like]: `%${searchKey}%` } },
        { machine_type: { [Op.like]: `%${searchKey}%` } },
        { machine_brand: { [Op.like]: `%${searchKey}%` } },
        { machine_location: { [Op.like]: `%${searchKey}%` } },
      ],
    };

    const machines = await Machine.findAll({
      where: whereCondition,
      include: [
        {
          model: SubOperation,
          as: "sub_operations",
          include: [
            {
              model: MainOperation,
              as: "mainOperation",
              include: [{ model: Style, as: "style" }],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      status: "success",
      message: "Search completed successfully",
      data: machines,
      count: machines.length,
    });
  } catch (error) {
    console.error("Search error:", error);
    return next(error);
  }
};

// Count all machines
exports.countMachines = async (req, res, next) => {
  try {
    console.log("counting machines");

    const machinesCount = await Machine.count();

    return res.status(200).json({
      success: true,
      count: machinesCount,
    });
  } catch (error) {
    console.error("Error counting machines:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to count machines",
    });
  }
};

// to get all machine details
exports.getMachineData = async (req, res, next) => {
  //
  try {
    const machineSet = await Machine.findAll({
      include: [
        {
          model: SubOperation,
          as: "sub_operations",
          include: [
            {
              model: MainOperation,
              as: "mainOperation",
              include: [{ model: Style, as: "style" }],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      status: "success",
      message: "Machine select success",
      data: machineSet,
    });
  } catch (error) {
    return next(error);
  }
};

// to get specific machine details
exports.getSMachineData = async (req, res, next) => {
  console.log("machine requested: ", req.params);
  try {
    const { id } = req.params;
    console.log("🔍 Fetching machine data for ID:", id);

    if (!id || isNaN(id)) {
      return res.status(400).json({
        status: "error",
        message: "Valid machine ID is required",
      });
    }

    const machine = await Machine.findByPk(id, {
      include: [
        {
          model: SubOperation,
          as: "sub_operations",
          attributes: [
            "sub_operation_id",
            "sub_operation_name",
            "sub_operation_number",
            "smv",
            "machine_type",
            "spi",
          ],
          through: { attributes: [] }, // Exclude junction table attributes
          include: [
            {
              model: MainOperation,
              as: "mainOperation",
              attributes: ["operation_id", "operation_name"],
              include: [
                {
                  model: Style,
                  as: "style",
                  attributes: [
                    "style_id",
                    "style_no",
                    "style_name",
                    "po_number",
                    "customer_id",
                    "factory_id",
                  ],
                },
              ],
            },
          ],
        },
        // Include needle types if needed
        {
          model: NeedleType,
          as: "needleTypes",
          attributes: ["needle_type_id", "needle_type_name"],
          required: false,
        },
        {
          model: NeedleTread,
          as: "needleTreads",
          attributes: ["needle_tread_id", "tread_name"],
          required: false,
        },
        {
          model: NeedleLooper,
          as: "needleLoopers",
          attributes: ["needle_looper_id", "looper_name"],
          required: false,
        },
      ],
    });

    if (!machine) {
      return res.status(404).json({
        status: "error",
        message: "Machine not found",
      });
    }

    const machineData = machine.toJSON();

    // Extract unique styles from sub_operations
    const styleMap = new Map();
    const subOperationsWithStyles = [];

    machineData.sub_operations?.forEach((subOp) => {
      if (subOp.mainOperation?.style) {
        const style = subOp.mainOperation.style;
        styleMap.set(style.style_id, style);

        // Add style info to sub-operation for frontend display
        subOperationsWithStyles.push({
          ...subOp,
          style: style,
        });
      } else {
        subOperationsWithStyles.push(subOp);
      }
    });

    // Convert map to array of unique styles
    const uniqueStyles = Array.from(styleMap.values());

    // Prepare response data
    const responseData = {
      ...machineData,
      styles: uniqueStyles,
      style_count: uniqueStyles.length,
      sub_operations: subOperationsWithStyles,
    };

    // Remove duplicate nested data if needed
    delete responseData.sub_operations?.forEach?.((op) => {
      if (op.mainOperation?.style) {
        delete op.mainOperation.style; // Already included in styles array
      }
    });

    res.status(200).json({
      status: "success",
      message: "Machine data retrieved successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("❌ Error in getSMachineData:", error);
    return next(error);
  }
};

// to create new machine
exports.createMachine = async (req, res, next) => {
  // console.log("Creating new machine...");
  if (req?.user?.userRole !== "Admin") {
    const error = new Error("You don't have permission to perform this action");
    error.status = 401;
    throw error;
  }
  const {
    machine_type,
    machine_no,
    machine_name,
    machine_brand,
    machine_location,
    purchase_date,
    supplier,
    service_date,
    breakdown_date,
    status,
  } = req.body;

  console.log("Request body: ", req.body);

  // Basic validation to avoid Sequelize errors
  if (!machine_no) {
    return res.status(400).json({
      status: "fail",
      message: "Machine number is required",
      field: "machine_no",
    });
  }

  try {
    // Check if machine number already exists
    const findMachine = await Machine.findOne({
      where: { machine_no: machine_no },
    });

    if (findMachine) {
      return res.status(400).json({
        status: "fail",
        message: "Machine number already exists",
        field: "machine_no",
      });
    }

    // Create new machine
    await Machine.create({
      machine_no: machine_no,
      machine_name: machine_name,
      machine_type: machine_type,
      machine_brand: machine_brand,
      machine_location: machine_location,
      purchase_date: purchase_date || null,
      supplier: supplier,
      service_date: service_date || null,
      breakdown_date: breakdown_date || null,
      machine_status: status,
    });

    return res
      .status(201)
      .json({ status: "success", message: "Machine saved successfully" });
  } catch (error) {
    console.error("Error creating machine:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error. Please try again later.",
    });
  }
};

// to edit new machine
exports.editMachine = async (req, res, next) => {
  //
  if (req?.user?.userRole !== "Admin") {
    const error = new Error("You don't have permission to perform this action");
    error.status = 401;
    throw error;
  }
  const { mId } = req.params;
  console.log(req.params);
  console.log(req.body);

  const {
    machine_id,
    machine_type,
    machine_no,
    machine_name,
    machine_brand,
    machine_location,
    status,
    breakdown_date,
    purchase_date,
  } = req.body;
  try {
    const updateMachine = await Machine.update(
      {
        machine_type,
        machine_no,
        machine_name,
        machine_brand,
        machine_location,
        machine_status: status,
        purchase_date,
      },
      {
        where: { machine_id },
      }
    );

    if (breakdown_date) {
      await Machine.update(
        {
          breakdown_date,
        },
        {
          where: { machine_id },
        }
      );
    }

    res
      .status(200)
      .json({ status: "success", message: "Machine update success" });
  } catch (error) {
    return next(error);
  }
};

// to delete new machine
exports.deleteMachine = async (req, res, next) => {
  //
  if (req?.user?.userRole !== "Admin") {
    const error = new Error("You don't have permission to perform this action");
    error.status = 401;
    throw error;
  }
  const { mId } = req.params;
  try {
    const deleteMachine = await Machine.destroy({ where: { machine_id: mId } });
    res
      .status(200)
      .json({ status: "success", message: "Machine delete success" });
  } catch (error) {}
};

// to generate excel file that includes machine details
exports.getExcelFile = async (req, res, next) => {
  console.log("generating excel");
  try {
    const machines = await Machine.findAll({
      attributes: {
        exclude: ["updatedAt"], // exclude updatedAt if you don’t want it
      },
    });

    // Create workbook & worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Machines");

    // Define columns
    worksheet.columns = [
      { header: "Machine ID", key: "machine_id", width: 12 },
      { header: "Machine No", key: "machine_no", width: 15 },
      { header: "Machine Name", key: "machine_name", width: 20 },
      { header: "Type", key: "machine_type", width: 10 },
      { header: "Brand", key: "machine_brand", width: 15 },
      { header: "Location", key: "machine_location", width: 20 },
      { header: "Purchase Date", key: "purchase_date", width: 20 },
      { header: "Supplier", key: "supplier", width: 15 },
      { header: "Service Date", key: "service_date", width: 20 },
      { header: "Status", key: "machine_status", width: 12 },
      { header: "Created At", key: "createdAt", width: 20 },
    ];

    // Style header row
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; // white bold text
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "4472C4" }, // blue header background
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Add rows
    machines.forEach((machine) => {
      worksheet.addRow(machine.dataValues);
    });

    // Send file to client
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=machines.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return next(error);
  }
};

// to get all machine types
exports.getMachineTypes = async (req, res, next) => {
  //
  console.log(req.body);
  console.log("get machine types =-=-=--=-=-=-=-=-=-=- ");
  try {
    const machineTypes = await Machine.findAll({
      attributes: [
        [
          Sequelize.fn("DISTINCT", Sequelize.col("machine_type")),
          "machine_type",
        ],
      ],
      raw: true,
    });

    const types = machineTypes.map((row) => row.machine_type);
    res.status(200).json({ status: 200, data: types });
    console.log(types); // ["TypeA", "TypeB", ...]
  } catch (error) {
    console.log("error while fetching machine types: ", error);
    return next(error);
  }
};

// to upload machine
exports.uploadMachines = async (req, res, next) => {
  console.log("=== UPLOAD MACHINES CONTROLLER CALLED ===");
  console.log("File received:", {
    name: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No Excel file uploaded. Please select a file.",
      });
    }

    const excelFile = req.file;

    // Validate file type
    const validMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];

    if (!validMimeTypes.includes(excelFile.mimetype)) {
      return res.status(400).json({
        success: false,
        error: "Invalid file type. Please upload .xlsx or .xls files only.",
      });
    }

    // Check if buffer exists
    if (!excelFile.buffer || excelFile.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: "File data is empty or corrupted.",
      });
    }

    console.log(
      `Processing Excel file: ${excelFile.originalname}, Size: ${excelFile.buffer.length} bytes`
    );

    // Extract data from Excel using the buffer
    const machinesData = await extractMachineDataFromExcel(excelFile.buffer);

    if (!machinesData || machinesData.length === 0) {
      return res.status(400).json({
        success: false,
        error:
          "No valid machine data found in the Excel file. Please check the file format and content.",
      });
    }

    console.log(`Found ${machinesData.length} machines in Excel file`);

    // Process and insert into database
    const results = {
      total: machinesData.length,
      successful: [],
      skipped: [],
      failed: [],
    };

    for (const machineData of machinesData) {
      try {
        // Check if machine already exists
        const existingMachine = await Machine.findOne({
          where: { machine_no: machineData.machine_no },
        });

        if (existingMachine) {
          console.log(
            `Machine ${machineData.machine_no} already exists, skipping...`
          );
          results.skipped.push({
            machine_no: machineData.machine_no,
            reason: "Already exists",
          });
          continue;
        }

        // Create new machine
        const machine = await Machine.create(machineData);
        results.successful.push({
          machine_id: machine.machine_id,
          machine_no: machine.machine_no,
          machine_name: machine.machine_name,
          machine_type: machine.machine_type,
          machine_brand: machine.machine_brand,
        });

        console.log(`✓ Inserted machine: ${machineData.machine_no}`);
      } catch (error) {
        console.error(
          `✗ Failed to insert machine ${machineData.machine_no}:`,
          error.message
        );
        results.failed.push({
          machine_no: machineData.machine_no,
          error: error.message,
        });
      }
    }

    // Prepare response
    const response = {
      success: true,
      message: `Excel file processed successfully!`,
      data: {
        summary: {
          total: results.total,
          successful: results.successful.length,
          skipped: results.skipped.length,
          failed: results.failed.length,
        },
        details: {
          successful: results.successful,
          skipped: results.skipped,
          failed: results.failed,
        },
      },
    };

    console.log(
      `Upload completed: ${results.successful.length} successful, ${results.skipped.length} skipped, ${results.failed.length} failed`
    );
    res.status(201).json(response);
  } catch (error) {
    console.error("Error in uploadMachines controller:", error);

    // Handle specific errors
    if (error.message.includes('Sheet "Machines" not found')) {
      return res.status(400).json({
        success: false,
        error:
          "No 'Machines' sheet found in the Excel file. Please check the sheet name.",
      });
    } else if (
      error.message.includes("Unable to read file") ||
      error.message.includes("file appears to be corrupted")
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Unable to read the Excel file. Please ensure it's a valid Excel file and not corrupted.",
      });
    }

    res.status(500).json({
      success: false,
      error:
        "Internal server error while processing Excel file: " + error.message,
    });
  }
};
