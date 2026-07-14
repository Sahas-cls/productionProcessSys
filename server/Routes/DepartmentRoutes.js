// DepartmentRoutes.js
const express = require("express");
const router = express.Router(); // This line was missing in your code
const departmentController = require("../controllers/DepartmentController");


router.post("/", departmentController.createDepartment);
// Get departments by factory ID
router.get("/:factory_id", departmentController.getDepartments);

router.get("/:department_id", departmentController.getDepartmentById); // Read (single)
router.put("/:department_id", departmentController.updateDepartment); // Update
router.delete("/:department_id", departmentController.deleteDepartment); // Delete

module.exports = router;
