const {
  Sequelize,
  Machine,
  SubOperation,
  MainOperation,
  Style,
} = require("../models");
const ExcelJS = require("exceljs");

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
        breakdown_date,
      },
      {
        where: { machine_id },
      }
    );

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
