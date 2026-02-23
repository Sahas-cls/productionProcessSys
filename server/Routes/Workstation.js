const express = require("express");
const router = express.Router();
const controllers = require("../controllers/WorkstationController");
const authMiddleware = require("../middlewares/AuthUser");

// to create empty workstation
router.post("/addEmptyWorkstation/:layoutId", controllers.createEmptyWS);

// to get workstation based on the provided workstation id
router.get("/getWorkstation/:id", controllers.getWorkstation);

// to get workstations based on the layout id
router.get("/getWorkstations/:id", controllers.getWorkstations);

// to edit specific workstation
router.put("/createWorkstation/:id", controllers.createWS);

// to rename workstaion
router.put("/renameWorkstation/:workstationId", controllers.workstationId);

// to delete specific workstation
router.delete("/deleteWS/:id", controllers.deleteWorkstation);

// to add sub operation for specific workstation
router.post("/addSubOperationToWorkstation/:wsId", controllers.addSubOperation);

// to delete sub operation from workstation
router.delete(
  "/deleteSubOperation/:subOpId/:wsId",
  controllers.deleteSubOperation,
);

// to delete helper operation from workstation
router.delete(
  "/deleteHOperation/:helperId/:wsId",
  controllers.deleteHOperation,
);

// to update sequence number of the
router.put("/sequence-update", controllers.updateSequenceNo);

// NOTE to create new helper workstation
router.post(
  "/create-helper-workstation",
  authMiddleware,
  controllers.createHelperWorkstation,
);

// to get helper workstations.
router.get(
  "/get-helper-workstations/:layoutId",
  controllers.getHelperWorkstation,
);

// to assign helper operation to workstations
router.post(
  "/add-helper-operation/:layoutId",
  authMiddleware,
  controllers.addHelperOperation,
);

module.exports = router;
