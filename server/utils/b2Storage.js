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
    this.baseFolder = "StyleImages";
    this.authorized = false;
    
    // CACHE SYSTEM - PREVENTS TRANSACTION OVERUSE
    this.authCache = {
      // General download auth (cached for 23 hours)
      downloadAuth: null,
      downloadAuthExpiry: 0,
      
      // Upload URL (cached, valid for 24 hours)
      uploadUrl: null,
      uploadAuthToken: null,
      uploadUrlExpiry: 0,
      
      // File-specific signed URLs (cached for 1 hour)
      signedUrls: new Map()
    };
  }

  // AUTHORIZE (CACHED - called only once per day)
  async authorize() {
    if (!this.authorized) {
      console.log("🔄 Authorizing with B2...");
      const response = await this.b2.authorize();
      this.authorized = true;
      this.apiUrl = response.data.apiUrl;
      this.downloadUrl = response.data.downloadUrl;
      console.log("✅ B2 Authorization cached for 24 hours");
      return response;
    }
  }

  // GET UPLOAD URL (CACHED - valid for 24 hours)
  async getUploadUrl() {
    await this.authorize();
    
    const now = Date.now();
    
    // Return cached upload URL if still valid (24 hours)
    if (this.authCache.uploadUrl && now < this.authCache.uploadUrlExpiry) {
      console.log("📦 Using cached upload URL");
      return {
        uploadUrl: this.authCache.uploadUrl,
        authorizationToken: this.authCache.uploadAuthToken
      };
    }
    
    console.log("🔄 Getting fresh upload URL");
    const response = await this.b2.getUploadUrl({
      bucketId: this.bucketId,
    });
    
    // Cache for 23.5 hours (to be safe)
    this.authCache.uploadUrl = response.data.uploadUrl;
    this.authCache.uploadAuthToken = response.data.authorizationToken;
    this.authCache.uploadUrlExpiry = now + (23.5 * 60 * 60 * 1000);
    
    return response.data;
  }

  // UPLOAD FILE
  async uploadFile(fileBuffer, fileName, folder = "") {
    try {
      const uploadUrlData = await this.getUploadUrl();
      
      const filePath = `${this.baseFolder}/${fileName}`;
      
      console.log(`📤 Uploading to: ${filePath}`);
      
      const uploadResponse = await this.b2.uploadFile({
        uploadUrl: uploadUrlData.uploadUrl,
        uploadAuthToken: uploadUrlData.authorizationToken,
        fileName: filePath,
        data: fileBuffer,
        mime: this.getMimeType(fileName),
      });

      console.log("✅ File uploaded to B2:", filePath);

      return {
        filePath: filePath,
        fileId: uploadResponse.data.fileId,
        fileName: fileName,
        b2Url: `${this.downloadUrl}/file/${this.bucketName}/${filePath}`,
        mediaUrl: filePath,
      };
    } catch (error) {
      console.error("B2 Upload Error:", error);
      throw error;
    }
  }

  // NOTE DELETE FILE
  async deleteFile(fileId, fileName) {
    try {
      console.log(`🗑️ Deleting: ${fileName}`);
      
      const response = await this.b2.deleteFileVersion({
        fileId: fileId,
        fileName: fileName,
      });

      console.log("✅ File deleted");
      return { success: true, data: response.data };
    } catch (error) {
      if (error.response?.status === 404) {
        console.log("ℹ️ File not found (already deleted)");
        return { success: true, message: "File not found" };
      }
      console.error("Delete error:", error.message);
      throw error;
    }
  }

  // GET DOWNLOAD AUTHORIZATION (CACHED - valid for 1 hour)
  async getDownloadAuthorization(filePath, expiresInSeconds = 3600) {
    try {
      await this.authorize();
      
      const now = Date.now();
      
      // Check if we have a general auth token cached
      if (this.authCache.downloadAuth && now < this.authCache.downloadAuthExpiry) {
        console.log("🔑 Using cached download auth token");
        return {
          authorizationToken: this.authCache.downloadAuth,
          downloadUrl: `${this.downloadUrl}/file/${this.bucketName}/${filePath}`,
        };
      }
      
      console.log("🔄 Getting fresh download authorization");
      
      // Get authorization for ALL files (empty prefix = works for any file)
      const authResponse = await this.b2.getDownloadAuthorization({
        bucketId: this.bucketId,
        fileNamePrefix: "", // EMPTY = works for all files!
        validDurationInSeconds: expiresInSeconds,
      });

      // Cache the token (1 hour - 5 minutes for safety)
      this.authCache.downloadAuth = authResponse.data.authorizationToken;
      this.authCache.downloadAuthExpiry = now + ((expiresInSeconds - 300) * 1000);

      console.log("✅ Download auth token cached for 1 hour");

      return {
        authorizationToken: this.authCache.downloadAuth,
        downloadUrl: `${this.downloadUrl}/file/${this.bucketName}/${filePath}`,
      };
    } catch (error) {
      console.error("B2 Auth Error:", error.message);
      throw error;
    }
  }

  // GET SIGNED URL (CACHED - uses cached auth token)
  async getSignedUrl(filePath, expiresInSeconds = 3600) {
    try {
      const auth = await this.getDownloadAuthorization(filePath, expiresInSeconds);
      
      return {
        downloadUrl: auth.downloadUrl,
        signedUrl: `${auth.downloadUrl}?Authorization=${auth.authorizationToken}`,
      };
    } catch (error) {
      console.error("B2 Signed URL Error:", error);
      throw error;
    }
  }

  // GET PUBLIC URL (no auth needed if bucket is public)
  async getPublicUrl (filePath) {
    await this.authorize(); // Just to ensure downloadUrl is set
    return `${this.downloadUrl}/file/${this.bucketName}/${filePath}`;
  }

  // SIMPLE PROXY METHOD - returns URL for frontend to use directly
  async getFileUrl(filePath, useSignedUrl = false) {
    if (useSignedUrl) {
      const signed = await this.getSignedUrl(filePath);
      return signed.signedUrl;
    }
    
    // Use public URL (make sure your bucket is public!)
    return this.getPublicUrl(filePath);
  }

  // DELETE FILE BY PATH
  async deleteFileByPath(filePath) {
    try {
      console.log(`🔍 Looking up file: ${filePath}`);
      
      // Find file by listing
      const files = await this.b2.listFileNames({
        bucketId: this.bucketId,
        prefix: filePath,
        maxFileCount: 1,
      });

      if (files.data.files.length > 0 && files.data.files[0].fileName === filePath) {
        return await this.deleteFile(files.data.files[0].fileId, filePath);
      }
      
      console.warn(`❌ File not found: ${filePath}`);
      return { success: false, message: "File not found" };
    } catch (error) {
      console.error("Delete error:", error);
      throw error;
    }
  }

  // LIST FILES (use sparingly - each call = 1 transaction)
  async listFiles(prefix = "", maxFileCount = 100) {
    try {
      await this.authorize();
      
      console.log(`📂 Listing files with prefix: ${prefix}`);
      
      const response = await this.b2.listFileNames({
        bucketId: this.bucketId,
        prefix: prefix,
        maxFileCount: maxFileCount,
      });

      return response.data.files;
    } catch (error) {
      console.error("List error:", error.message);
      throw error;
    }
  }

  // GET MIME TYPE
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
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".avi": "video/x-msvideo",
      ".wmv": "video/x-ms-wmv",
      ".flv": "video/x-flv",
      ".mkv": "video/x-matroska",
      ".svg": "image/svg+xml",
      ".bmp": "image/bmp",
      ".tiff": "image/tiff",
      ".tif": "image/tiff",
    };

    return mimeTypes[ext] || "application/octet-stream";
  }

  // CLEAR CACHE (useful for testing)
  clearCache() {
    this.authCache = {
      downloadAuth: null,
      downloadAuthExpiry: 0,
      uploadUrl: null,
      uploadAuthToken: null,
      uploadUrlExpiry: 0,
      signedUrls: new Map()
    };
    console.log("🧹 Cache cleared");
  }
}

module.exports = new B2Storage();