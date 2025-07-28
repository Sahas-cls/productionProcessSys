const express = require("express");
const router = express.Router();
const controllers = require("../controllers/WorkstationController");

router.put("/createWorkstation/:id", controllers.createWS);
router.delete("/deleteWS/:id", controllers.deleteWorkstation);

module.exports = router;
