const express = require("express");
const routes = express.Router();
const controller = require("../controllers/OperationBuletinController");

routes.get("/getAllOB", controller.getBOList);
routes.post("/createOB", controller.createBulkOperations);
routes.post("/createHelperOps", controller.createHelperOps);

module.exports = routes;
