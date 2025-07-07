const express = require("express");
const routes = express.Router();
const customerTypeController = require("../controllers/CustomerTypesController");

routes.get("/getCustomerTypes", customerTypeController.getCustomerTypes);

module.exports = routes;
