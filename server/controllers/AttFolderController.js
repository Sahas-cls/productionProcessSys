const { where, Op } = require("sequelize");
const { AttachmentFolder, AttachmentMedia } = require("../models");

// NOTE TO GET ALL FOLDERS
exports.getAllFolders = async (req, res, next) => {
  try {
    const folders = await AttachmentFolder.findAll({
      order: [["createdAt", "DESC"]],
    });
    res.status(200).json({ status: "Ok", data: folders });
  } catch (error) {
    console.log(error);
  }
};

// NOTE TO SEARCH FOLDER
exports.folderSearch = async (req, res, next) => {
  const { keyword } = req.params;
  console.log(req.params);
  console.log(keyword || "No Key word");
  if (!keyword || keyword.trim().length <= 2) {
    return;
  }
  try {
    const folders = await AttachmentFolder.findAll({
      where: { folder_name: { [Op.like]: `%${keyword}%` } },
      attributes: ["folder_id", "folder_name"],
      limit: 5,
    });

    res.status(200).json({ status: "Ok", data: folders });
  } catch (error) {
    console.log("Error while filtering att folders: ", error);
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

    // 2. Check if folder already exists (optional but recommended)
    const existingFolder = await AttachmentFolder.findOne({
      where: {
        folder_name: folderName.trim(),
        created_by: req.user.userId,
      },
    });

    if (existingFolder) {
      return res.status(409).json({
        status: "Error",
        msg: "A folder with this name already exists",
      });
    }

    // 3. Create the folder
    const createFolder = await AttachmentFolder.create({
      folder_name: folderName.trim(),
      created_by: req.user?.userId || null,
    });

    // 4. Send success response
    res.status(201).json({
      status: "Ok",
      msg: "Folder created successfully",
      data: {
        id: createFolder.id,
        folderName: createFolder.folder_name,
        createdAt: createFolder.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating folder:", error);

    // Send error response
    res.status(500).json({
      status: "Error",
      msg: "Failed to create folder. Please try again.",
    });
  }
};

// NOTE TO DELETE FOLDER
exports.deleteFolder = async (req, res, next) => {
  const { folderId } = req.params;
  console.log("deleing folder", folderId);

  try {
    const folder = await AttachmentFolder.findOne({
      where: { folder_id: folderId },
    });
    if (!folder) {
      return res.status(404).json({
        status: "Error",
        msg: "The requested folder was not found. It may have been deleted or does not exist.",
      });
    }

    const isRelatedRecords = await AttachmentMedia.findOne({
      where: { folder_id: folderId },
    });

    if (isRelatedRecords) {
      return res.status(400).json({
        status: "Error",
        msg: "This folder have attachment media, first delete them and try again",
      });
    }

    const deleteFolder = await folder.destroy();

    res.status(200).json({ status: "Ok", msg: "Folder Delete success" });
  } catch (error) {
    console.log("error while deleting folder: ", error);
  }
};

// NOTE TO RENAME A FOLDER
exports.renameFolder = async (req, res, next) => {
  const { folderId } = req.params;
  const { folderName } = req.body;

  try {
    const isExist = await AttachmentFolder.findOne({
      where: { folder_name: folderName },
    });
    if (isExist) {
      return res.status(400).json({
        status: "Error",
        msg: "The provided name is already exist in our records",
      });
    }

    const folder = await AttachmentFolder.findOne({
      where: { folder_id: folderId },
    });

    if (!folder) {
      return res.status(404).json({
        status: "Error",
        msg: "The requested folder is no longer available",
      });
    }

    await folder.update({ folder_name: folderName.trim() });

    res.status(200).json({ status: "Ok", msg: "Folder rename success" });
  } catch (error) {
    console.log(error);
  }
};
