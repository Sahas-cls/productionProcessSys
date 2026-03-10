const fs = require("fs");
const path = require("path");

const STORAGE_BASE = "/mnt/bulletin-assets";

/**
 * Save file to mounted storage
 * @param {Buffer} fileBuffer
 * @param {String} mediaType (video, image, document, techpack)
 * @param {String|Number} subOpId
 * @param {String} fileName
 */
      
const saveFile = (fileBuffer, mediaType, subOpId, fileName) => {
  try {
    const folderPath = path.join(STORAGE_BASE, mediaType, subOpId.toString());

    // Ensure directory exists
    fs.mkdirSync(folderPath, { recursive: true });

    const filePath = path.join(folderPath, fileName);

    fs.writeFileSync(filePath, fileBuffer);

    // Return relative path to store in DB
    return `/${mediaType}/${subOpId}/${fileName}`;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete file from storage
 */
const deleteFile = (relativePath) => {
  const filePath = path.join(STORAGE_BASE, relativePath);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

module.exports = {
  saveFile,
  deleteFile,
};
