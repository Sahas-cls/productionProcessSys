const db = require("../models");
const bcrypt = require("bcrypt");
const User = db.User;
const Notification = db.Notification;
const UserCategory = db.UserCategory;
const userCategories = db.UserCategory;
const SubOperation = db.SubOperation;
const SubOperationLog = db.SubOperationLog;
const MainOperation = db.MainOperation;
const Factory = db.Factory;
const Department = db.Department;
const Style = db.Style;
const jwt = require("jsonwebtoken");
const { where } = require("sequelize");

// to create new user on db
exports.userRegister = async (req, res, next) => {
  // console.log(req);
  try {
    const {
      userName,
      userEmail,
      userFactory,
      userDepartment,
      userPassword,
      userCategory,
    } = req.body;

    const hashedPassword = await bcrypt.hash(userPassword, 10);

    const newUser = {
      user_name: userName,
      user_email: userEmail,
      user_factory: userFactory,
      user_department: userDepartment,
      user_category: userCategory,
      user_password: hashedPassword,
    };
    const createNewUser = await User.create(newUser);
    if (createNewUser) {
      return res
        .status(201)
        .json({ success: true, message: "User Registration Success" });
    }
  } catch (error) {
    next(error);
  }
};

// to fetch user categories from db
exports.getUserCategories = async (req, res, next) => {
  try {
    const categories = await userCategories.findAll();

    return res.status(200).json({ status: "success", data: categories });
  } catch (error) {
    next(error); // Pass to global error handler
  }
};

// for user login
exports.userLogin = async (req, res, next) => {
  const { userName, userPassword } = req.body;

  try {
    // Find the user
    const isUser = await User.findOne({ where: { user_name: userName } });

    if (!isUser) {
      const error = new Error("Invalid username");
      error.status = 401;
      return next(error);
    }

    // check user status
    if (isUser.status !== "Active") {
      const error = new Error(
        "Your account has been blocked by the administrator. Please contact support."
      );
      error.status = 403;
      throw error;
    }

    // Check password
    const isPassword = await bcrypt.compare(userPassword, isUser.user_password);
    if (!isPassword) {
      const error = new Error("Invalid password");
      error.status = 401;
      return next(error);
    }

    // Destructure needed fields
    const {
      user_id,
      user_name,
      user_email,
      user_category,
      user_factory,
      user_department,
    } = isUser;

    // Fetch related info
    const category = await UserCategory.findOne({
      where: { category_id: user_category },
    });
    const factory = await Factory.findOne({
      where: { factory_id: user_factory },
    });
    const department = await Department.findOne({
      where: { department_id: user_department },
    });

    // Safety checks (optional but good for clean code)
    if (!category || !factory || !department) {
      const error = new Error("Related user data not found");
      error.status = 500;
      return next(error);
    }

    // Prepare the user payload
    const crrUser = {
      userId: user_id,
      userName: user_name,
      userEmail: user_email,
      userCategory: user_category,
      userCategoryN: category.category_name,
      userFactory: user_factory,
      userFactoryN: factory.factory_name,
      userDepartment: user_department,
      userDepartmentN: department.department_name,
    };

    // Generate JWT
    const jwtToken = jwt.sign(crrUser, process.env.JWT_SECRET, {
      expiresIn: "3h",
    });

    // Set JWT cookie
    res.cookie("jwt", jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    // Send response
    return res.status(200).json({
      status: "success",
      user: crrUser,
    });
  } catch (error) {
    next(error);
  }
};

// check user have access to client side routes
exports.authCheck = async (req, res, next) => {
  // console.log("Authenticating user ========= *************** ===============");
  const token = req.cookies.jwt;

  if (!token) {
    const error = new Error("No token, authorization denied");
    error.status = 401;
    return next(error); // ✅ added return
  }

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    // console.log("decode ========== ", decode);

    const user = {
      userId: decode.userId,
      userRole: decode.userCategoryN, // ✅ keep consistent naming
    };

    return res.status(200).json({
      status: "success",
      user,
    });
  } catch (error) {
    console.error("Auth Error:", error.message);
    error.status = 403;
    return next(error); // ✅ let global handler handle it
  }
};

// to user logout
exports.logoutUser = async (req, res, next) => {
  try {
    // Clear the JWT cookie by setting it to an empty value and expiring it immediately
    res.cookie("jwt", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      expires: new Date(0), // Expire the cookie immediately
    });

    // Optionally, send a response
    res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    next(error); // Pass any error to the error handler
  }
};

// to fetch notifications
exports.getNotifications = async (req, res) => {
  console.log("");
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user.userId },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({ data: notifications });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// to get notification detailed view
exports.getNotificationDetails = async (req, res, next) => {
  const { ntfId } = req.params;
  console.log("req params, ", req.params);
  try {
    // 1. Find notification
    const notification = await Notification.findByPk(ntfId);

    if (!notification) {
      const error = new Error("Can't find that notification in the database");
      error.status = 400;
      throw error;
    }

    // make notification reade when getting details preview
    await notification.update({ isRead: true });

    // 2. Fetch new values (current sub operation)
    const newValues = await SubOperation.findByPk(notification.operation_id, {
      include: [
        {
          model: MainOperation,
          as: "mainOperation",
          include: [{ model: Style, as: "style" }],
        },
      ],
    });

    // 3. Fetch the most recent log (old values)
    const oldValues = await SubOperationLog.findOne({
      where: { sub_operation_id: notification.operation_id },
      order: [["createdAt", "DESC"]],
    });

    // 4. Send response
    res.status(200).json({
      newData: newValues || null,
      oldData: oldValues || null,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

// ========================== admin panel operations
// ========================== admin panel operations

// to get all users data
exports.getAllUsers = async (req, res, next) => {
  //
  console.log(req.user);
  console.log(req.body);
  if (req?.user?.userRole !== "Admin" && req?.user?.userRole !== "SuperAdmin") {
    console.error("Unauthorized");
    return res
      .status(401)
      .json({ message: "You don't have permission to perform this action" });
  }
  try {
    console.log("authorized");
    const users = await User.findAll({
      attributes: {
        exclude: ["user_password"],
      },
      include: [
        { model: Factory, as: "factory" },
        { model: Department, as: "department" },
        { model: UserCategory, as: "category" },
      ],
    });

    return res.status(200).json({ data: users });
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

// reset password
exports.resetPassword = async (req, res, next) => {
  const { userId } = req.params;
  const { password } = req.body;
  try {
    if (!userId) {
      const error = new Error("There is no user id include with response");
      error.status = 400;
      throw error;
    }

    if (!password) {
      const error = new Error("New password required");
      error.status = 400;
      throw error;
    }

    // request is ok changing password
    const user = await User.findByPk(userId);

    if (!user) {
      const error = new Error("Can't find that user on database");
      error.status = 400;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await user.update({ user_password: hashedPassword });
    console.log(
      "password reset success ====================== =============== = = = = = "
    );
    res.status(200).json({
      status: "Ok",
      message: `Password reset success of user ${user.user_name}`,
    });
  } catch (error) {
    return next(error);
  }
  // 3Eq40
};

// to block/unblock user
exports.changeUserStatus = async (req, res, next) => {
  const { userId } = req.params;
  try {
    if (
      req?.user?.userRole !== "Admin" &&
      req?.user?.userRole !== "SuperAdmin"
    ) {
      return res.status(401).json({
        message: "You don't have permission to perform this action",
      });
    }

    if (!userId) {
      const error = new Error("User ID is required");
      error.status = 400;
      throw error;
    }

    const user = await User.findByPk(userId, {
      include: [{ model: UserCategory, as: "category" }],
    });

    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    // Prevent blocking yourself
    if (user.user_id === req.user.userId) {
      return res.status(400).json({
        message: "You cannot block/unblock yourself",
      });
    }

    // Prevent modifying SuperAdmin unless you're SuperAdmin
    if (
      user.category?.category_name === "SuperAdmin" &&
      req?.user?.userRole !== "SuperAdmin"
    ) {
      return res.status(403).json({
        message: "Only SuperAdmin can modify other SuperAdmin users",
      });
    }

    const newStatus = user.status === "Active" ? "Blocked" : "Active";
    await user.update({ status: newStatus });

    res.status(200).json({
      status: "Ok",
      message: `User ${user.user_name} has been ${
        newStatus === "Blocked" ? "blocked" : "unblocked"
      }`,
      data: { status: newStatus },
    });
  } catch (error) {
    return next(error);
  }
};

// to change user role
exports.changeUserRole = async (req, res, next) => {
  const { userId } = req.params;
  const { roleId } = req.body;

  try {
    if (
      req?.user?.userRole !== "Admin" &&
      req?.user?.userRole !== "SuperAdmin"
    ) {
      return res.status(401).json({
        message: "You don't have permission to perform this action",
      });
    }

    if (!userId || !roleId) {
      const error = new Error("User ID and Role ID are required");
      error.status = 400;
      throw error;
    }

    // Check if role exists
    const role = await UserCategory.findByPk(roleId);
    if (!role) {
      const error = new Error("Invalid role ID");
      error.status = 400;
      throw error;
    }

    const user = await User.findByPk(userId, {
      include: [{ model: UserCategory, as: "category" }],
    });

    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    // Prevent changing your own role
    if (user.user_id === req.user.userId) {
      return res.status(400).json({
        message: "You cannot change your own role",
      });
    }

    // Prevent changing SuperAdmin role unless you're SuperAdmin
    if (
      user.category?.category_name === "SuperAdmin" &&
      req?.user?.userRole !== "SuperAdmin"
    ) {
      return res.status(403).json({
        message: "Only SuperAdmin can modify other SuperAdmin users",
      });
    }

    // Prevent promoting to SuperAdmin unless you're SuperAdmin
    if (
      role.category_name === "SuperAdmin" &&
      req?.user?.userRole !== "SuperAdmin"
    ) {
      return res.status(403).json({
        message: "Only SuperAdmin can assign SuperAdmin role",
      });
    }

    await user.update({ user_category: roleId });

    res.status(200).json({
      status: "Ok",
      message: `User ${user.user_name} role changed to ${role.category_name}`,
      data: {
        category_id: roleId,
        category_name: role.category_name,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// to delete user
exports.deleteUser = async (req, res, next) => {
  const { userId } = req.params;

  try {
    if (
      req?.user?.userRole !== "Admin" &&
      req?.user?.userRole !== "SuperAdmin"
    ) {
      return res.status(401).json({
        message: "You don't have permission to perform this action",
      });
    }

    if (!userId) {
      const error = new Error("User ID is required");
      error.status = 400;
      throw error;
    }

    const user = await User.findByPk(userId, {
      include: [{ model: UserCategory, as: "category" }],
    });

    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    // Prevent deleting yourself
    if (user.user_id === req.user.userId) {
      return res.status(400).json({
        message: "You cannot delete yourself",
      });
    }

    // Prevent deleting SuperAdmin unless you're SuperAdmin
    if (
      user.category?.category_name === "SuperAdmin" &&
      req?.user?.userRole !== "SuperAdmin"
    ) {
      return res.status(403).json({
        message: "Only SuperAdmin can delete other SuperAdmin users",
      });
    }

    await user.destroy();

    res.status(200).json({
      status: "Ok",
      message: `User ${user.user_name} has been deleted successfully`,
    });
  } catch (error) {
    return next(error);
  }
};

// Get all user categories
exports.getAllCategories = async (req, res, next) => {
  try {
    if (
      req?.user?.userRole !== "Admin" &&
      req?.user?.userRole !== "SuperAdmin"
    ) {
      return res.status(401).json({
        message: "You don't have permission to perform this action",
      });
    }

    const categories = await UserCategory.findAll({
      attributes: ["category_id", "category_name"],
    });

    res.status(200).json({
      status: "Ok",
      data: categories,
    });
  } catch (error) {
    return next(error);
  }
};
