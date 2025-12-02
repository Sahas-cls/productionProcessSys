const db = require("../models");
const bcrypt = require("bcrypt");
const User = db.User;
const UserCategory = db.UserCategory;
const userCategories = db.UserCategory;
const Factory = db.Factory;
const Department = db.Department;
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
