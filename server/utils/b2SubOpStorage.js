// utils/b2SubOpStorage.js
const B2 = require("backblaze-b2");
const path = require("path");
require("dotenv").config();

class B2SubOpStorage {
  constructor() {
    this.b2 = new B2({
      applicationKeyId: process.env.B2_KEY_ID,
      applicationKey: process.env.B2_APP_KEY,
    });

    this.bucketId = process.env.B2_BUCKET_ID;
    this.bucketName = process.env.B2_BUCKET_NAME;
    this.authorized = false;
  }

  async authorize() {
    if (!this.authorized) {
      await this.b2.authorize();
      this.authorized = true;
    }
  }

  async uploadSubOpFile(fileBuffer, fileName, folderType, subOpId) {
    try {
      // Validate inputs
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error("File buffer is empty");
      }

      if (!fileName || fileName.trim() === "") {
        throw new Error("Filename is required");
      }

      console.log(`📤 Starting B2 upload:`, {
        fileName,
        folderType,
        bufferSize: fileBuffer.length,
      });

      await this.authorize();

      // Get upload URL
      const uploadUrlResponse = await this.b2.getUploadUrl({
        bucketId: this.bucketId,
      });

      // Construct file path based on type
      let folderPath;
      switch (folderType) {
        case "hVideo":
          folderPath = `HelperOpVideos`;
          break;
        case "video":
          folderPath = `SubOpVideos`;
          break;
        case "image":
          folderPath = `SubOpImages`;
          break;
        case "techpack":
          folderPath = `SubOpTechPacks`;
          break;
        case "document":
          folderPath = `SubOpFolders`;
          break;
        default:
          folderPath = `SubOpFiles`;
      }

      console.error("folder type: ", folderPath);
      // return;

      // ✅ FIXED: Direct folder path without subOpId subfolder
      const fullFilePath = `${folderPath}/${fileName}`;

      console.log(`📁 Uploading to: ${fullFilePath}`);

      // Upload file
      const uploadResponse = await this.b2.uploadFile({
        uploadUrl: uploadUrlResponse.data.uploadUrl,
        uploadAuthToken: uploadUrlResponse.data.authorizationToken,
        fileName: fullFilePath, // Use full path with filename
        data: fileBuffer,
        mime: this.getMimeType(fileName),
      });

      console.log(`✅ File uploaded to B2: ${fullFilePath}`);

      return {
        filePath: fullFilePath, // Full path with filename
        fileId: uploadResponse.data.fileId,
        fileName: fileName,
        fullPath: fullFilePath,
      };
    } catch (error) {
      console.error("❌ B2 Upload Error:", error);
      throw error;
    }
  }

  async deleteFile(fileId, filePath) {
    try {
      await this.authorize();

      // Delete file from B2
      await this.b2.deleteFileVersion({
        fileId: fileId,
        fileName: filePath,
      });

      console.log(`✅ File deleted from B2: ${filePath}`);
      return true;
    } catch (error) {
      console.error("❌ B2 Delete Error:", error);

      // If file not found - already deleted? or something
      if (error.response && error.response.status === 404) {
        console.log(`ℹ️ File not found in B2 (already deleted?): ${filePath}`);
        return true;
      }

      throw error;
    }
  }

  getMimeType(fileName) {
    const ext = path.extname(fileName).toLowerCase();

    const mimeTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".mp4": "video/mp4",
      ".avi": "video/x-msvideo",
      ".mov": "video/quicktime",
      ".pdf": "application/pdf",
      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".csv": "text/csv",
      ".txt": "text/plain",
    };

    return mimeTypes[ext] || "application/octet-stream";
  }
}

module.exports = new B2SubOpStorage();
