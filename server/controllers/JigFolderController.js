// controllers/JigFolderController.js
const { where, Op } = require("sequelize");
const { JigFolder, JigOperationMedia, User } = require("../models");

// NOTE TO GET FOLDER BY ID
exports.getFolder = async (req, res, next) => {
  const { id } = req.params;
  try {
    const folder = await JigFolder.findByPk(id);

    if (!folder) {
      return res
        .status(404)
        .json({ status: "error", msg: "Cannot found a folder" });
    }

    res.status(200).json({ status: "Ok", data: folder });
  } catch (error) {
    console.log(error);
  }
};

// NOTE TO GET ALL FOLDERS
exports.getAllFolders = async (req, res, next) => {
  try {
    const folders = await JigFolder.findAll({
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: User,
          as: "created", // ✅ Changed from "creator" to "created" to match model
          attributes: ["user_id", "user_name"],
        },
      ],
      attributes: [
        "folder_id",
        "folder_name",
        "created_by",
        "createdAt",
        "updatedAt",
      ],
    });

    res.status(200).json({
      status: "Ok",
      data: folders,
    });
  } catch (error) {
    console.error("Error fetching folders:", error);
    res.status(500).json({
      status: "Error",
      msg: "Failed to fetch folders",
    });
  }
};

// NOTE TO SEARCH FOLDER
exports.folderSearch = async (req, res, next) => {
  const { keyword } = req.params;
  console.log(req.params);
  console.log(keyword || "No Key word");

  if (!keyword || keyword.trim().length <= 2) {
    return res.status(400).json({
      status: "Error",
      msg: "Keyword must be at least 3 characters long",
    });
  }

  try {
    const folders = await JigFolder.findAll({
      where: {
        folder_name: { [Op.like]: `%${keyword}%` },
      },
      attributes: [
        "folder_id",
        "folder_name",
        "created_by", // ✅ Fixed attribute name
        "createdAt", // ✅ Fixed to match model
        "updatedAt", // ✅ Fixed to match model
      ],
      include: [
        {
          model: User,
          as: "created", // ✅ Changed from "creator" to "created"
          attributes: ["user_id", "user_name"],
        },
      ],
      limit: 5,
    });

    res.status(200).json({
      status: "Ok",
      data: folders,
    });
  } catch (error) {
    console.log("Error while filtering jig folders: ", error);
    res.status(500).json({
      status: "Error",
      msg: "Error while searching folders",
    });
  }
};

// NOTE TO CREATE A NEW FOLDER
exports.createNewFolder = async (req, res, next) => {
  try {
    const { folderName } = req.body;

    if (!folderName || !folderName.trim()) {
      return res.status(400).json({
        status: "Error",
        msg: "Folder name is required",
      });
    }

    // Check if folder already exists with same name and parent
    const whereClause = {
      folder_name: folderName.trim(),
    };

    const existingFolder = await JigFolder.findOne({
      where: whereClause,
    });

    if (existingFolder) {
      return res.status(409).json({
        status: "Error",
        msg: "A folder with this name already exists in this location",
      });
    }

    // ✅ Create the folder with correct field name
    const createFolder = await JigFolder.create({
      folder_name: folderName.trim(),
      created_by: req.user?.userId || null, // ✅ Changed from created_by to created_by
    });

    // Fetch created folder with associations
    const newFolder = await JigFolder.findByPk(createFolder.folder_id, {
      include: [
        {
          model: User,
          as: "created", // ✅ Changed from "creator" to "created"
          attributes: ["user_id", "user_name"],
        },
      ],
    });

    res.status(201).json({
      status: "Ok",
      msg: "Jig folder created successfully",
      data: {
        folder_id: newFolder.folder_id,
        folder_name: newFolder.folder_name,
        parent_folder_id: newFolder.parent_folder_id,
        created_by: newFolder.created_by,
        creator: newFolder.created, // ✅ Using the correct alias
        createdAt: newFolder.createdAt,
        updatedAt: newFolder.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error creating jig folder:", error);
    res.status(500).json({
      status: "Error",
      msg: "Failed to create jig folder. Please try again.",
    });
  }
};

// NOTE TO DELETE FOLDER
exports.deleteFolder = async (req, res, next) => {
  const { folderId } = req.params;
  console.log("Deleting jig folder:", folderId);

  try {
    // Find the folder
    const folder = await JigFolder.findOne({
      where: { folder_id: folderId },
    });

    if (!folder) {
      return res.status(404).json({
        status: "Error",
        msg: "The requested folder was not found. It may have been deleted or does not exist.",
      });
    }

    // Check for media files
    const relatedMedia = await JigOperationMedia.findOne({
      where: { folder_id: folderId },
    });

    if (relatedMedia) {
      return res.status(400).json({
        status: "Error",
        msg: "This folder contains media files. Please delete them first.",
      });
    }

    // Delete the folder
    await folder.destroy();

    res.status(200).json({
      status: "Ok",
      msg: "Jig folder deleted successfully",
    });
  } catch (error) {
    console.log("Error while deleting jig folder: ", error);
    res.status(500).json({
      status: "Error",
      msg: "Failed to delete jig folder",
    });
  }
};

// NOTE TO RENAME A FOLDER
exports.renameFolder = async (req, res, next) => {
  const { folderId } = req.params;
  const { folderName } = req.body;

  try {
    if (!folderName || !folderName.trim()) {
      return res.status(400).json({
        status: "Error",
        msg: "Folder name is required",
      });
    }

    // Find the folder
    const folder = await JigFolder.findOne({
      where: { folder_id: folderId },
    });

    if (!folder) {
      return res.status(404).json({
        status: "Error",
        msg: "The requested folder is no longer available",
      });
    }

    // Check if folder with same name exists in same parent
    const whereClause = {
      folder_name: folderName.trim(),
      folder_id: { [Op.ne]: folderId }, // Exclude current folder
    };

    const existingFolder = await JigFolder.findOne({
      where: whereClause,
    });

    if (existingFolder) {
      return res.status(400).json({
        status: "Error",
        msg: "A folder with this name already exists in this location",
      });
    }

    // Update the folder name
    await folder.update({
      folder_name: folderName.trim(),
    });

    // Fetch updated folder with associations
    const updatedFolder = await JigFolder.findByPk(folderId, {
      include: [
        {
          model: User,
          as: "created", // ✅ Changed from "creator" to "created"
          attributes: ["user_id", "user_name"],
        },
      ],
    });

    res.status(200).json({
      status: "Ok",
      msg: "Jig folder renamed successfully",
      data: updatedFolder,
    });
  } catch (error) {
    console.log("Error while renaming jig folder:", error);
    res.status(500).json({
      status: "Error",
      msg: "Failed to rename jig folder",
    });
  }
};

// Additional helper function: Get folder hierarchy
exports.getFolderHierarchy = async (req, res, next) => {
  try {
    const folders = await JigFolder.findAll({
      where: { parent_folder_id: null },
      include: [
        {
          model: JigFolder,
          as: "subfolders",
          include: [
            {
              model: User,
              as: "created", // ✅ Changed from "creator" to "created"
              attributes: ["user_id", "user_name"],
            },
          ],
        },
        {
          model: User,
          as: "created", // ✅ Changed from "creator" to "created"
          attributes: ["created_by", "user_name"],
        },
      ],
      order: [["folder_name", "ASC"]],
    });

    res.status(200).json({
      status: "Ok",
      data: folders,
    });
  } catch (error) {
    console.error("Error fetching folder hierarchy:", error);
    res.status(500).json({
      status: "Error",
      msg: "Failed to fetch folder hierarchy",
    });
  }
};
