const express = require("express");
const routes = express.Router();
const factoryController = require("../controllers/FactoryController");
const { factoryValidator } = require("../validators/FactoryValidator");
const validateRequest = require("../middlewares/ValidateUser");

// to get all factories
routes.get("/getFactories", factoryController.getFactories);

// to create new factory
routes.post(
  "/createNewFactory",
  factoryValidator,
  validateRequest,
  factoryController.createFactory
);

//to edit factory
routes.put(
  "/updateFactory/:id",
  factoryValidator,
  validateRequest,
  factoryController.updateFactory
);

routes.delete("/deleteFactory/:id", factoryController.deleteFactory);

module.exports = routes;
