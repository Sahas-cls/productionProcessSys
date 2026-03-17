const { body } = require("express-validator");

exports.customerValidator = [
  body("customerType").trim().notEmpty().withMessage("Customer type required"),
  body("customerName")
    .trim()
    .notEmpty()
    .withMessage("Customer name required")
    .isLength({ min: 3 })
    .withMessage("Customer name should contain at least 3 characters"),
];
