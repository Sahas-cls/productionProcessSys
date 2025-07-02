const { Customer } = require("../models");

// to create new customer
exports.createCustomer = async (req, res, next) => {
  console.log(req.body);
};

// to edit existing customer
exports.editCustomer = async (req, res, next) => {
  console.log(req.body);
};

// to delete existing customer
exports.deleteCustomer = async (req, res, next) => {
  console.log(req.body);
};
