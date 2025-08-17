const { Machine, SubOperation, MainOperation, Style } = require("../models");

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
  console.log("Creating new machine...");

  const {
    machine_type,
    machine_no,
    machine_name,
    machine_brand,
    machine_location,
    purchase_date,
    supplier,
    service_date,
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
      purchase_date: purchase_date,
      supplier: supplier,
      service_date: service_date,
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
  const { mId } = req.params;
  try {
    const deleteMachine = await Machine.destroy({ where: { machine_id: mId } });
    res
      .status(200)
      .json({ status: "success", message: "Machine delete success" });
  } catch (error) {}
};
