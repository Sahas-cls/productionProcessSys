// NOTE consider the helper operations will create when uploading operation bulletin excel & is not contains here
const express = require("express");
const router = express.Router();
const controllers = require("../controllers/HelperOperationController");

router.get("/getHelperOperations/:styleId", controllers.getHelperOperations);

module.exports = router;
