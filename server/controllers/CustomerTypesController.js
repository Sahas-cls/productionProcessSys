const { CustomerType } = require("../models");

exports.getCustomerTypes = async (req, res, next) => {
  //   console.log("taking customer types");
  try {
    const customerTypes = await CustomerType.findAll();
    // console.log(customerTypes);
    res.status(200).json({ status: "success", data: customerTypes });
  } catch (error) {
    return next(error);
  }
};
