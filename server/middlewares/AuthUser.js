// middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    // Read cookie
    const token = req.cookies.jwt;

    if (!token) {
      console.log("no token found");
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("toekn verified ---------- ");
    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      userRole: decoded.userCategoryN, // or decoded.userCategory if you want the ID
    };

    next();
  } catch (error) {
    console.error("Auth Error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
