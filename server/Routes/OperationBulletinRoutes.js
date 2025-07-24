const express = require("express");
const routes = express.Router();
const controller = require("../controllers/OperationBuletinController");

// to fetch all operation list and helper operation list
routes.get("/getAllOB", controller.getBOList);

// to edit main operation data
routes.put("/edit-main-operation/:id", controller.editMainOperation);

// to create new operation bulletin
routes.post("/createOB", controller.createBulkOperations);

// to edit specific sub operation
routes.put("/edit-sub-operation/:id", controller.updateSubOperation);

// to delete specific sub operation with it's needle layout
routes.delete("/delete-sub-operation/:id", controller.deleteSubOperation);

// to create new helper operation
routes.post("/createHelperOps", controller.createHelperOps);

// to delete operation
routes.delete("/deleteBO/:id", controller.deleteOperation);

module.exports = routes;
