const express = require("express");
const routes = express.Router();
const controller = require("../controllers/OperationBuletinController");
const authMiddleware = require("../middlewares/AuthUser");

// to fetch all operation list and helper operation list
routes.get("/getAllOB", controller.getBOList);

// to get operations and sub operations for specific style + po =
routes.get("/getOB/:styleId", controller.getSBO);

// to edit main operation data
routes.put(
  "/edit-main-operation/:id",
  authMiddleware,
  controller.editMainOperation
);

// to create new operation bulletin
routes.post("/createOB", authMiddleware, controller.createBulkOperations);

// to create main operation for specific style
routes.post(
  "/create/main-operation",
  authMiddleware,
  controller.createMainOperation
);

// to create sub operation for specific main operation
routes.post("/create/sub-operation", authMiddleware, controller.createSubOp);

// to edit specific sub operation
routes.put("/edit-sub-operation/:id", controller.updateSubOperation);

// to delete specific sub operation with it's needle layout
routes.delete(
  "/delete-sub-operation/:id",
  authMiddleware,
  controller.deleteSubOperation
);

// to create new helper operation
routes.post("/createHelperOps", authMiddleware, controller.createHelperOps);

// to delete operation
routes.delete("/deleteBO/:id", authMiddleware, controller.deleteOperation);

module.exports = routes;
