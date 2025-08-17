const express = require("express");
const router = express.Router();
const controlers = require("../controllers/MachineController");

// to get machine details
router.get("/getMachiens", controlers.getMachineData);

// to create new mahcine
router.post("/createMachine", controlers.createMachine);

// to edit machine
router.put("/editMachine/:mId", controlers.editMachine);

// to delete machine
router.delete("/deleteMachine/:mId", controlers.deleteMachine);

module.exports = router;
