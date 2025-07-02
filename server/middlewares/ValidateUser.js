const { validationResult } = require("express-validator");

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.error(errors);
    const error = {
      status: 422,
      message: "validation errors",
      success: false,
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    };
    next(error);
  }

  next();
};

module.exports = validateRequest;
