const express = require("express");
const routes = express.Router();
const controller = require("../controllers/ThreadController");
const authMiddleWare = require("../middlewares/AuthUser");

// to create new threat
routes.post("/createThread", authMiddleWare, controller.createThread);

// to edit threat
routes.put("/editThread/:thread_id", authMiddleWare, controller.editThread);

// to delete threat
routes.delete("/deleteThread/:thread_id", authMiddleWare, controller.deleteThread);

// to get all threats
routes.get("/getThread", authMiddleWare, controller.getTread);

module.exports = routes;
