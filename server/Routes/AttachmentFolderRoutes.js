const express = require("express");
const route = express.Router();
const controller = require("../controllers/AttFolderController");
const authUser = require("../middlewares/AuthUser");

// NOTE to get folder based on folder id
route.get("/get-folder/:id", controller.getFolder);

//NOTE to get all folder details
route.get("/get-folders", controller.getAllFolders);

// NOTE to get folders live search
route.get("/get-folders/:keyword", controller.folderSearch);

//NOTE to create new folder
route.post("/create-att-folder", authUser, controller.createNewFolder);

// TODO to delete existing folder
route.delete("/delete-att-folder/:folderId", controller.deleteFolder);

// TODO to rename existing folder
route.patch("/rename-att-folder/:folderId", controller.renameFolder);

module.exports = route;
