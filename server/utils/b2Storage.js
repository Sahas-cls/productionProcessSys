// utils/b2Storage.js
const B2 = require("backblaze-b2");
const path = require("path");
require("dotenv").config();

class B2Storage {
  constructor() {
    this.b2 = new B2({
      applicationKeyId: process.env.B2_KEY_ID,
      applicationKey: process.env.B2_APP_KEY,
    });

    this.bucketId = process.env.B2_BUCKET_ID;
    this.bucketName = process.env.B2_BUCKET_NAME;
    this.baseFolder = "StyleImages"; // Your folder structure
    this.authorized = false;
    this.uploadUrlData = null;
  }

  async authorize() {
    if (!this.authorized) {
      const response = await this.b2.authorize();
      this.authorized = true;

      // Store the response for later use
      this.apiUrl = response.data.apiUrl; // https://api00X.backblazeb2.com
      this.downloadUrl = response.data.downloadUrl; // https://f00X.backblazeb2.com

      return response;
    }
  }

  async getUploadUrl() {
    await this.authorize();

    // Get fresh upload URL for each upload
    const response = await this.b2.getUploadUrl({
      bucketId: this.bucketId,
    });

    return response.data;
  }

  async uploadFile(fileBuffer, fileName, folder = "") {
    try {
      await this.authorize();

      // Get upload URL
      const uploadUrlResponse = await this.b2.getUploadUrl({
        bucketId: this.bucketId,
      });

      // ============================================
      // MODIFIED: Remove folder from path construction
      // ============================================
      // OLD: With folder structure
      // const filePath = folder
      //   ? `${this.baseFolder}/${folder}/${fileName}`
      //   : `${this.baseFolder}/${fileName}`;

      // NEW: Flat structure - all files directly in StyleImages
      const filePath = `${this.baseFolder}/${fileName}`;
      // Result: StyleImages/filename.jpg (no subfolders)
      // ============================================

      // Upload file
      const uploadResponse = await this.b2.uploadFile({
        uploadUrl: uploadUrlResponse.data.uploadUrl,
        uploadAuthToken: uploadUrlResponse.data.authorizationToken,
        fileName: filePath,
        data: fileBuffer,
        mime: this.getMimeType(fileName),
      });

      console.log("File uploaded to B2:", filePath);

      return {
        filePath: filePath,
        fileId: uploadResponse.data.fileId,
        fileName: fileName,
        // Return B2 URL for public access
        b2Url: `${this.downloadUrl}/file/${this.bucketName}/${filePath}`,
        // For database storage, we'll use filePath
        mediaUrl: filePath,
      };
    } catch (error) {
      console.error("B2 Upload Error:", error);
      throw error;
    }
  }

  async deleteFile(fileId, fileName) {
    try {
      console.log(`Deleting file: ${fileName} (ID: ${fileId})`);

      const response = await this.b2.deleteFileVersion({
        fileId: fileId,
        fileName: fileName,
      });

      console.log("✅ File deleted successfully");
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Delete error:", error.response?.data || error.message);

      // If file doesn't exist (404), that's okay
      if (error.response?.status === 404) {
        console.log("File already deleted or not found");
        return { success: true, message: "File not found (already deleted)" };
      }

      throw error;
    }
  }

  async listFiles(prefix = "", maxFileCount = 100) {
    try {
      await this.authorize();

      const response = await this.b2.listFileNames({
        bucketId: this.bucketId,
        prefix: prefix,
        maxFileCount: maxFileCount,
      });

      return response.data.files;
    } catch (error) {
      console.error("List files error:", error.response?.data || error.message);
      throw error;
    }
  }

  async deleteFileByPath(filePath) {
    try {
      console.log(`Looking up file by path: ${filePath}`);

      // First, list files to find the fileId
      const files = await this.listFiles(filePath, 1);

      if (files.length > 0 && files[0].fileName === filePath) {
        return await this.deleteFile(files[0].fileId, filePath);
      } else {
        console.warn(`File not found in B2: ${filePath}`);
        return { success: false, message: "File not found" };
      }
    } catch (error) {
      console.error("Delete by path error:", error);
      throw error;
    }
  }

  async getDownloadAuthorization(filePath, expiresInSeconds = 3600) {
    try {
      await this.authorize();

      // Get download authorization
      const authResponse = await this.b2.getDownloadAuthorization({
        bucketId: this.bucketId,
        fileNamePrefix: filePath,
        validDurationInSeconds: expiresInSeconds,
      });

      return {
        authorizationToken: authResponse.data.authorizationToken,
        downloadUrl: `${this.downloadUrl}/file/${this.bucketName}/${filePath}`,
      };
    } catch (error) {
      console.error(
        "B2 Download Auth Error:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async getSignedUrl(filePath, expiresInSeconds = 3600) {
    try {
      const auth = await this.getDownloadAuthorization(
        filePath,
        expiresInSeconds
      );

      return {
        downloadUrl: auth.downloadUrl,
        signedUrl: `${auth.downloadUrl}?Authorization=${auth.authorizationToken}`,
      };
    } catch (error) {
      console.error("B2 Signed URL Error:", error);
      throw error;
    }
  }

  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
      ".mp4": "video/mp4",
      ".mov": "video/quicktime",
      ".avi": "video/x-msvideo",
      ".svg": "image/svg+xml",
      ".bmp": "image/bmp",
      ".tiff": "image/tiff",
      ".tif": "image/tiff",
    };

    return mimeTypes[ext] || "application/octet-stream";
  }

  // Helper to construct public URL (if bucket is public)
  getPublicUrl(filePath) {
    if (!this.downloadUrl) {
      // Fallback if not authorized yet
      return `https://f005.backblazeb2.com/file/${this.bucketName}/${filePath}`;
    }
    return `${this.downloadUrl}/file/${this.bucketName}/${filePath}`;
  }

  // List files in a folder (useful for debugging or bulk operations)
  async listFiles(prefix = "", maxFileCount = 100) {
    try {
      await this.authorize();

      const response = await this.b2.listFileNames({
        bucketId: this.bucketId,
        prefix: prefix,
        maxFileCount: maxFileCount,
      });

      return response.data.files;
    } catch (error) {
      console.error(
        "B2 List Files Error:",
        error.response?.data || error.message
      );
      throw error;
    }
  }
}

module.exports = new B2Storage();
