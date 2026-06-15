const B2 = require("backblaze-b2");
const path = require("path");
require("dotenv").config();

class B2SpecialVideoStorage {
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

  async uploadSpecialVideo(fileBuffer, fileName) {
    try {
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error("File buffer is empty");
      }

      if (!fileName || fileName.trim() === "") {
        throw new Error("Filename is required");
      }

      console.log(`📤 Starting B2 special video upload:`, {
        fileName,
        bufferSize: fileBuffer.length,
      });

      await this.authorize();

      const uploadUrlResponse = await this.b2.getUploadUrl({
        bucketId: this.bucketId,
      });

      // Upload to SpecialOperations folder
      const fullFilePath = `SpecialOperations/${fileName}`;

      console.log(`📁 Uploading to: ${fullFilePath}`);

      const uploadResponse = await this.b2.uploadFile({
        uploadUrl: uploadUrlResponse.data.uploadUrl,
        uploadAuthToken: uploadUrlResponse.data.authorizationToken,
        fileName: fullFilePath,
        data: fileBuffer,
        mime: this.getMimeType(fileName),
      });

      console.log(`✅ Special video uploaded to B2: ${fullFilePath}`);

      return {
        filePath: fullFilePath,
        fileId: uploadResponse.data.fileId,
        fileName: fileName,
        fullPath: fullFilePath,
      };
    } catch (error) {
      console.error("❌ B2 Special Video Upload Error:", error);
      throw error;
    }
  }

  async deleteFile(fileId, filePath) {
    try {
      await this.authorize();

      await this.b2.deleteFileVersion({
        fileId: fileId,
        fileName: filePath,
      });

      console.log(`✅ Special video deleted from B2: ${filePath}`);
      return true;
    } catch (error) {
      console.error("❌ B2 Special Video Delete Error:", error);

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
      ".mp4": "video/mp4",
      ".avi": "video/x-msvideo",
      ".mov": "video/quicktime",
      ".mkv": "video/x-matroska",
      ".webm": "video/webm",
      ".wmv": "video/x-ms-wmv",
      ".flv": "video/x-flv",
      ".m4v": "video/x-m4v",
      ".mpg": "video/mpeg",
      ".mpeg": "video/mpeg",
    };
    return mimeTypes[ext] || "video/mp4";
  }
}

module.exports = new B2SpecialVideoStorage();
