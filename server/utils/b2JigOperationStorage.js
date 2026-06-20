const B2 = require("backblaze-b2");
const path = require("path");
require("dotenv").config();

class B2JigOperationStorage {
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

  /**
   * Upload jig operation media (image or video) to B2
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileName - Generated file name
   * @param {string} mediaType - 'image' or 'video'
   * @returns {Promise<Object>} Upload result with filePath and fileId
   */
  async uploadJigOperationMedia(fileBuffer, fileName, mediaType) {
    try {
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error("File buffer is empty");
      }

      if (!fileName || fileName.trim() === "") {
        throw new Error("Filename is required");
      }

      if (!mediaType || !["image", "video"].includes(mediaType)) {
        throw new Error("Media type must be 'image' or 'video'");
      }

      console.log(`📤 Starting B2 jig operation upload:`, {
        fileName,
        bufferSize: fileBuffer.length,
        mediaType,
      });

      await this.authorize();

      const uploadUrlResponse = await this.b2.getUploadUrl({
        bucketId: this.bucketId,
      });

      // Determine folder structure: JigOperations/Images/ or JigOperations/Videos/
      const folderName = mediaType === "image" ? "Images" : "Videos";
      const fullFilePath = `JigOperations/${folderName}/${fileName}`;

      console.log(`📁 Uploading to: ${fullFilePath}`);

      const uploadResponse = await this.b2.uploadFile({
        uploadUrl: uploadUrlResponse.data.uploadUrl,
        uploadAuthToken: uploadUrlResponse.data.authorizationToken,
        fileName: fullFilePath,
        data: fileBuffer,
        mime: this.getMimeType(fileName, mediaType),
      });

      console.log(
        `✅ Jig operation ${mediaType} uploaded to B2: ${fullFilePath}`,
      );

      return {
        filePath: fullFilePath,
        fileId: uploadResponse.data.fileId,
        fileName: fileName,
        fullPath: fullFilePath,
        mediaType: mediaType,
      };
    } catch (error) {
      console.error(`❌ B2 Jig Operation Upload Error (${mediaType}):`, error);
      throw error;
    }
  }

  /**
   * Delete file from B2
   * @param {string} fileId - B2 file ID
   * @param {string} filePath - Full file path in B2
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(fileId, filePath) {
    try {
      await this.authorize();

      await this.b2.deleteFileVersion({
        fileId: fileId,
        fileName: filePath,
      });

      console.log(`✅ Jig operation file deleted from B2: ${filePath}`);
      return true;
    } catch (error) {
      console.error("❌ B2 Delete Error:", error);

      // If file not found, consider it already deleted
      if (error.response && error.response.status === 404) {
        console.log(`ℹ️ File not found in B2 (already deleted?): ${filePath}`);
        return true;
      }

      throw error;
    }
  }

  /**
   * Get MIME type based on file extension and media type
   * @param {string} fileName - File name with extension
   * @param {string} mediaType - 'image' or 'video'
   * @returns {string} MIME type
   */
  getMimeType(fileName, mediaType) {
    const ext = path.extname(fileName).toLowerCase();

    const imageMimeTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".bmp": "image/bmp",
      ".svg": "image/svg+xml",
      ".tiff": "image/tiff",
      ".ico": "image/x-icon",
    };

    const videoMimeTypes = {
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
      ".3gp": "video/3gpp",
    };

    if (mediaType === "image") {
      return imageMimeTypes[ext] || "image/jpeg";
    } else {
      return videoMimeTypes[ext] || "video/mp4";
    }
  }
}

module.exports = new B2JigOperationStorage();
