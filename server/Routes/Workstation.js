const express = require("express");
const router = express.Router();
const controllers = require("../controllers/WorkstationController");

router.put("/createWorkstation/:id", controllers.createWS);

module.exports = router;
