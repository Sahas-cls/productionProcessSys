const express = require("express");
const routes = express.Router();
const controller = require("../controllers/OperationBuletinController");

// to fetch all operation list and helper operation list
routes.get("/getAllOB", controller.getBOList);

// to get operations and sub operations for specific style + po =
routes.get("/getOB/:styleId", controller.getSBO);

// to edit main operation data
routes.put("/edit-main-operation/:id", controller.editMainOperation);

// to create new operation bulletin
routes.post("/createOB", controller.createBulkOperations);

// to create main operation for specific style
routes.post("/create/main-operation", controller.createMainOperation);

// to create sub operation for specific main operation
routes.post("/create/sub-operation", controller.createSubOp);

// to edit specific sub operation
// routes.put("/edit-sub-operation/:id", controller.createSubOperation);

// to delete specific sub operation with it's needle layout
routes.delete("/delete-sub-operation/:id", controller.deleteSubOperation);

// to create new helper operation
routes.post("/createHelperOps", controller.createHelperOps);

// to delete operation
routes.delete("/deleteBO/:id", controller.deleteOperation);

module.exports = routes;
