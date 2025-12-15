const express = require("express");
const routes = express.Router();
const userController = require("../controllers/UserController");
const authMiddleWare = require("../middlewares/AuthUser");
const {
  registerValidation,
  LoginValidation,
} = require("../validators/UserValidations");
const validateRequest = require("../middlewares/ValidateUser");

// to register new user
routes.post(
  "/register",
  registerValidation,
  validateRequest,
  userController.userRegister
);

// to fetch all user categories from db
routes.get("/getUserCategories", userController.getUserCategories);

// for user login
routes.post(
  "/login",
  LoginValidation,
  validateRequest,
  userController.userLogin
);

// to logout
routes.post("/logout", userController.logoutUser);

// to get notifications user wise
routes.get(
  "/get_notifications",
  authMiddleWare,
  userController.getNotifications
);

// to get detailed view of specific notification
routes.get(
  "/get_notification/:ntfId",
  authMiddleWare,
  userController.getNotificationDetails
);

// auth user
routes.get("/authCheck", userController.authCheck);
module.exports = routes;
