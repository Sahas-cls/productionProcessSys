const { body } = require("express-validator");

exports.customerValidator = [
  body("type")
    .trim()
    .notEmpty()
    .withMessage("Needle type required")
    .isLength({ min: 3, max: 200 })
    .withMessage("Characters should between 1-200"),
  body("category")
    .trim()
    .notEmpty()
    .withMessage("Needle category cannot be null")
    .isLength({ min: 3, max: 200 })
    .withMessage("Characters should between 1-200"),
];
