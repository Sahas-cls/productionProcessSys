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

// ======================== for admin account user data manipulation
// to get all users data
routes.get("/getAllUsers", authMiddleWare, userController.getAllUsers);

// to reset password
routes.put("/resetPassword/:userId", authMiddleWare, userController.resetPassword);

// to change status of users
routes.put("/blockUser/:userId", authMiddleWare, userController.changeUserStatus);

// to change user role
routes.put("/changeRole/:userId", authMiddleWare, userController.changeUserRole);

// to delete user
routes.delete("/deleteUser/:userId", authMiddleWare, userController.deleteUser);

// to get all user categories
routes.get("/categories", authMiddleWare, userController.getAllCategories);