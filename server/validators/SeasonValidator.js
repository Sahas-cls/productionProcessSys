const { body } = require("express-validator");

exports.seasonValidator = [
  body("customerId")
    .isInt()
    .withMessage("customerId must be an integer")
    .toInt(),

  body("seasons")
    .isArray({ min: 1 })
    .withMessage("seasons must be a non-empty array"),

  body("seasons.*")
    .isString()
    .withMessage("each season must be a string")
    .notEmpty()
    .withMessage("season values must not be empty"),
];
