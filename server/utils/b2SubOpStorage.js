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

  async authorize(force = false) {
    if (!this.authorized || force) {
      console.log("🔐 Authorizing with Backblaze B2...");
      await this.b2.authorize();
      this.authorized = true;
      console.log("✅ B2 authorization successful.");
    }
  }

  isAuthError(error) {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;

    return (
      status === 401 ||
      code === "expired_auth_token" ||
      code === "bad_auth_token"
    );
  }

  async getUploadUrl() {
    try {
      await this.authorize();

      return await this.b2.getUploadUrl({
        bucketId: this.bucketId,
      });
    } catch (error) {
      if (this.isAuthError(error)) {
        console.warn("⚠️ B2 authorization expired. Re-authorizing...");

        await this.authorize(true);

        return await this.b2.getUploadUrl({
          bucketId: this.bucketId,
        });
      }

      throw error;
    }
  }

  async uploadSubOpFile(fileBuffer, fileName, folderType, subOpId) {
    try {
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error("File buffer is empty");
      }

      if (!fileName || fileName.trim() === "") {
        throw new Error("Filename is required");
      }

      console.log("📤 Starting B2 upload:", {
        fileName,
        folderType,
        bufferSize: fileBuffer.length,
      });

      const uploadUrlResponse = await this.getUploadUrl();

      let folderPath;

      switch (folderType) {
        case "hVideo":
          folderPath = "HelperOpVideos";
          break;
        case "video":
          folderPath = "SubOpVideos";
          break;
        case "image":
          folderPath = "SubOpImages";
          break;
        case "techpack":
          folderPath = "SubOpTechPacks";
          break;
        case "document":
          folderPath = "SubOpFolders";
          break;
        default:
          folderPath = "SubOpFiles";
      }

      const fullFilePath = `${folderPath}/${fileName}`;

      console.log(`📁 Uploading to: ${fullFilePath}`);

      let uploadResponse;

      try {
        uploadResponse = await this.b2.uploadFile({
          uploadUrl: uploadUrlResponse.data.uploadUrl,
          uploadAuthToken: uploadUrlResponse.data.authorizationToken,
          fileName: fullFilePath,
          data: fileBuffer,
          mime: this.getMimeType(fileName),
        });
      } catch (error) {
        if (this.isAuthError(error)) {
          console.warn("⚠️ Upload token expired. Retrying upload...");

          const newUploadUrl = await this.getUploadUrl();

          uploadResponse = await this.b2.uploadFile({
            uploadUrl: newUploadUrl.data.uploadUrl,
            uploadAuthToken: newUploadUrl.data.authorizationToken,
            fileName: fullFilePath,
            data: fileBuffer,
            mime: this.getMimeType(fileName),
          });
        } else {
          throw error;
        }
      }

      console.log(`✅ File uploaded to B2: ${fullFilePath}`);

      return {
        filePath: fullFilePath,
        fileId: uploadResponse.data.fileId,
        fileName,
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

      await this.b2.deleteFileVersion({
        fileId,
        fileName: filePath,
      });

      console.log(`✅ File deleted from B2: ${filePath}`);
      return true;
    } catch (error) {
      if (this.isAuthError(error)) {
        console.warn("⚠️ B2 authorization expired. Retrying delete...");

        await this.authorize(true);

        await this.b2.deleteFileVersion({
          fileId,
          fileName: filePath,
        });

        console.log(`✅ File deleted from B2: ${filePath}`);
        return true;
      }

      if (error.response?.status === 404) {
        console.log(`ℹ️ File not found in B2 (already deleted?): ${filePath}`);
        return true;
      }

      console.error("❌ B2 Delete Error:", error);
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
