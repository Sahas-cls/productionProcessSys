const { isColString } = require("sequelize/lib/utils");
const { Customer, CustomerType } = require("../models");

// to get all customers
exports.getCustomers = async (req, res, next) => {
  //   console.log(req.body);
  try {
    const result = await Customer.findAll({
      include: [
        {
          model: CustomerType,
          as: "type",
          required: true, // this makes it an INNER JOIN
        },
      ],
    });
    if (result) {
      console.log("success");
      res.status(200).json({ status: "success", data: result });
    }
    // console.log(result);
  } catch (error) {
    return next(error);
  }
};

// to create new customer
exports.createCustomer = async (req, res, next) => {
  console.log(req.body);
  try {
    const { customerType, customerName, userId } = req.body;
    console.log("User ID:", userId);
    console.log("Customer Data:", req.body);

    // Create new customer
    const newCustomer = await Customer.create({
      customer_type_id: customerType,
      customer_name: customerName,
      created_by: parseInt(userId),
    });

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: newCustomer,
    });
  } catch (error) {
    next(error);
  }
};

// to edit existing customer
exports.editCustomer = async (req, res, next) => {
  console.log(req.body);
  const cusId = req.params.id;
  // console.log("params ", req.params.id);
  console.log("customer id: ", cusId);
  const { customerType, customerName, userId } = req.body;
  console.log(customerType, customerName, userId);
  try {
    const customer = await Customer.findByPk(cusId);
    if (!customer) {
      const error = new Error("Cannot find that customer on database");
      return next(error);
    }

    await customer.update({
      customer_type_id: customerType,
      customer_name: customerName,
      created_by: userId,
    });

    res
      .status(200)
      .json({ status: "success", message: "Customer update success" });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

// to delete existing customer
exports.deleteCustomer = async (req, res, next) => {
  // console.log(req.body);
  const customer_id = req.params.id;
  console.log(customer_id);

  try {
    const customer = await Customer.findByPk(customer_id);

    if (!customer) {
      const error = new Error("Customer cannot be found in database");
      error.status(404);
      return next(error);
    }

    // delete the customer
    await customer.destroy();

    res
      .status(200)
      .json({ status: "success", message: "Customer delete success" });
  } catch (error) {
    return next(error);
  }
};
