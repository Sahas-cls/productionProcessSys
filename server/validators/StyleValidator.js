const { body } = require("express-validator");

exports.styleValidator = [
  body("styleFactory")
    .trim()
    .notEmpty()
    .withMessage("Factory required")
    .isInt({ gt: 0 }),
  body("styleCustomer")
    .trim()
    .notEmpty()
    .withMessage("Style required")
    .isInt({ gt: 0 }),
  body("styleSeason")
    .trim()
    .notEmpty()
    .withMessage("Season required")
    .isInt({ gt: 0 }),
  body("styleNo").trim().notEmpty().withMessage("Style number required"),
  body("styleName").trim().notEmpty().withMessage("Style name required"),
  body("styleDescription")
    .isString()
    .withMessage("styleDescription must be a string")
    .isLength({ max: 255 })
    .withMessage("styleDescription must be at most 255 characters"),
];
