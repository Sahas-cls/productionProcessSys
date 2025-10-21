// DepartmentRoutes.js
const express = require("express");
const router = express.Router(); // This line was missing in your code
const departmentController = require("../Controllers/DepartmentController");

// Get departments by factory ID
router.get("/:factory_id", departmentController.getDepartments);

module.exports = router;
