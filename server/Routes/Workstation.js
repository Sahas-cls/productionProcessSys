const express = require("express");
const router = express.Router();
const controllers = require("../controllers/WorkstationController");

// to create empty workstation
router.post("/addEmptyWorkstation/:layoutId", controllers.createEmptyWS);

// to get workstation based on the provided workstation id
router.get("/getWorkstation/:id", controllers.getWorkstation);

// to get workstations based on the layout id
router.get("/getWorkstations/:id", controllers.getWorkstations);

// to edit specific workstation
router.put("/createWorkstation/:id", controllers.createWS);

// to delete specific workstation
router.delete("/deleteWS/:id", controllers.deleteWorkstation);

// to add sub operation for specific workstation
router.post("/addSubOperationToWorkstation/:wsId", controllers.addSubOperation);

// to delete sub operation from workstation
router.delete(
  "/deleteSubOperation/:subOpId/:wsId",
  controllers.deleteSubOperation
);

module.exports = router;
