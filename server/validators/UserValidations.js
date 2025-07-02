const { body } = require("express-validator");
const { User } = require("../models");
const { where } = require("sequelize");

exports.registerValidation = [
  body("userName")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters")
    .custom(async (value) => {
      const existUN = await User.findOne({ where: { user_name: value } });
      if (existUN) {
        throw new Error("User name already taken please enter new one");
      }
      return true;
    }),
  body("userEmail")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  body("userPassword")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  body("userFactory").isInt().withMessage("Factory must be an integer"),

  body("userDepartment").isInt().withMessage("Department must be an integer"),

  body("userCategory").isInt().withMessage("Category must be an integer"),
];

exports.LoginValidation = [
  body("userName")
    .trim()
    .notEmpty()
    .withMessage("User name required")
    .isLength({ min: 3 })
    .withMessage("User name should contain at least 3 characters"),

  body("userPassword")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];
