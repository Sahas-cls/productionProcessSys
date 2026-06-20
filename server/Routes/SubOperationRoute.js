const express = require("express");
const route = express.Router();
const controller = require("../controllers/SubOperationController");

// NOTE GET SUB OPERATIONS LIST
route.get("/get-subOperations", controller.getSubOperations);
route.get("/get-subOperations/:keyword", controller.getSubOperations);

module.exports = route;
