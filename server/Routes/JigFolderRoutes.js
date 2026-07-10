// routes/JigFolderRoutes.js
const express = require("express");
const route = express.Router();
const controller = require("../controllers/JigFolderController");
const authUser = require("../middlewares/AuthUser");

// NOTE to get all folder details
route.get("/get-folders", controller.getAllFolders);

// NOTE to get folders live search
route.get("/get-folders/:keyword", controller.folderSearch);

// NOTE to create new folder
route.post("/create-jig-folder", authUser, controller.createNewFolder);

// TODO to delete existing folder
route.delete("/delete-jig-folder/:folderId", controller.deleteFolder);

// TODO to rename existing folder
route.patch("/rename-jig-folder/:folderId", controller.renameFolder);

module.exports = route;
