const express = require("express");
const router = express.Router();
const controllers = require("../controllers/HandleMediaController");

// to get data for add media interface
router.get("/getMachineDetails/:subOpId", controllers.getMachineDetails);

module.exports = router;
