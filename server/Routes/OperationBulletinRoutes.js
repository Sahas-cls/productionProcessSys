const express = require("express");
const routes = express.Router();
const controller = require("../controllers/OperationBuletinController");

routes.get("/getAllOB", controller.getBOList);
routes.post("/createOB", controller.createBulkOperations);

module.exports = routes;
