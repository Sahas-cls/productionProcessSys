const express = require("express");
const routes = express.Router();
const customerController = require("../controllers/CustomerController");
const { customerValidator } = require("../validators/CustomerValidator");
const validateCustomer = require("../middlewares/ValidateUser");
const authMiddleware = require("../middlewares/AuthUser");

routes.get("/getCustomers", customerController.getCustomers);

// to create new customer
routes.post(
  "/createCustomer",
  authMiddleware,
  customerValidator,
  validateCustomer,
  customerController.createCustomer
);

// to edit existing customer
routes.put(
  "/editCustomer/:id",
  authMiddleware,
  customerController.editCustomer
);

// to delete existing customer
routes.delete(
  "/deleteCustomer/:id",
  authMiddleware,
  customerController.deleteCustomer
);

module.exports = routes;
