const express = require("express");
const routes = express.Router();
const customerController = require("../controllers/CustomerController");
const { customerValidator } = require("../validators/CustomerValidator");
const validateCustomer = require("../middlewares/ValidateUser");

routes.get("/getCustomers", customerController.getCustomers);

// to create new customer
routes.post(
  "/createCustomer",
  customerValidator,
  validateCustomer,
  customerController.createCustomer
);

// to edit existing customer
routes.put("/editCustomer/:id", customerController.editCustomer);

// to delete existing customer
routes.delete("/deleteCustomer/:id", customerController.deleteCustomer);

module.exports = routes;
