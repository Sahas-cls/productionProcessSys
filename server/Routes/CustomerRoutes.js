const express = require("express");
const routes = express.Router();
const customerController = require("../controllers/CustomerController");

// to create new customer
routes.post("/createCustomer", customerController.createCustomer);

// to edit existing customer
routes.put("/editCustomer", customerController.editCustomer);

// to delete existing customer
routes.delete("/deleteCustomer", customerController.deleteCustomer);

module.exports = routes;
