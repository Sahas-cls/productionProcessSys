const express = require("express");
const router = express.Router();
const controlers = require("../controllers/MachineController");
const authMiddleware = require("../middlewares/AuthUser");

// to get machine details
router.get("/getMachiens", controlers.getMachineData);

// to get machine types
router.get("/getMachineTypes", controlers.getMachineTypes);

// to create new mahcine
router.post("/createMachine", authMiddleware, controlers.createMachine);

// to edit machine
router.put("/editMachine/:mId", authMiddleware, controlers.editMachine);

// to delete machine
router.delete("/deleteMachine/:mId", authMiddleware, controlers.deleteMachine);

router.get("/getExcel", controlers.getExcelFile);

module.exports = router;
