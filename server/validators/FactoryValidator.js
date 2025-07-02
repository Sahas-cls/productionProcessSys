const { Factory } = require("../models");
const { body } = require("express-validator");

exports.factoryValidator = [
  body("factoryCode")
    .trim()
    .notEmpty()
    .withMessage("Factory code cannot be empty")
    .isLength({ min: 3 })
    .withMessage("Factory code should contain at least 3 chars"),

  body("factoryName")
    .trim()
    .notEmpty()
    .withMessage("Factory name cannot be empty")
    .isLength({ min: 3 })
    .withMessage("Factory name should contain at least 3 chars"),
];
