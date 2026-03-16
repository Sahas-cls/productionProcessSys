const fs = require("fs").promises;
const path = require("path");
const fsSync = require("fs");

const STORAGE_BASE =
  process.platform === "win32" ? "Y:" : "/mnt/bulletin-assets";

class LocalSubOpStorage {
  constructor() {
    this.storageBase = STORAGE_BASE;
  }

  /**
   * Ensure directory exists
   */
  async ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      console.error(`Error creating directory ${dirPath}:`, error);
      throw error;
    }
  }

  /**
   * Upload file to local storage - NO SUBFOLDERS
   */
  async uploadSubOpFile(fileBuffer, fileName, folderType, subOpId) {
    try {
      // Validate inputs
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error("File buffer is empty");
      }

      if (!fileName || fileName.trim() === "") {
        throw new Error("Filename is required");
      }

      console.log(`📤 Starting local storage upload:`, {
        fileName,
        folderType,
        subOpId,
        bufferSize: fileBuffer.length,
      });

      // Determine folder path based on type - NO subOpId subfolder
      let folderPath;
      switch (folderType) {
        case "video":
          folderPath = path.join(this.storageBase, "HelperOpVideos");
          break;
        case "image":
          folderPath = path.join(this.storageBase, "HelperOpImages");
          break;
        default:
          folderPath = path.join(this.storageBase, "HelperOpFiles");
      }

      // Create directory if it doesn't exist
      await this.ensureDir(folderPath);

      // Full file path - directly in the folder, no subfolder
      const fullFilePath = path.join(folderPath, fileName);

      // Write file
      await fs.writeFile(fullFilePath, fileBuffer);

      // Return relative path from storage base (for database)
      // This will be like: "SubOpVideos/filename.mp4"
      const relativePath = path
        .relative(this.storageBase, fullFilePath)
        .replace(/\\/g, "/");

      console.log(`✅ File saved locally: ${fullFilePath}`);
      console.log(`📁 Relative path: ${relativePath}`);

      return {
        filePath: relativePath, // Relative path for DB
        fullPath: fullFilePath, // Full path for internal use
        fileName: fileName,
        fileId: null, // No file ID for local storage
      };
    } catch (error) {
      console.error("❌ Local Storage Upload Error:", error);
      throw error;
    }
  }

  /**
   * Delete file from local storage
   */
  async deleteFile(filePath) {
    try {
      if (!filePath) {
        console.log("⚠️ No file path provided for deletion");
        return true;
      }

      const fullPath = path.join(this.storageBase, filePath);

      // Check if file exists
      if (fsSync.existsSync(fullPath)) {
        await fs.unlink(fullPath);
        console.log(`✅ File deleted from local storage: ${fullPath}`);
      } else {
        console.log(
          `ℹ️ File not found in local storage (already deleted?): ${fullPath}`,
        );
      }

      // Optional: Clean up empty directories (but won't affect main folders)
      const parentDir = path.dirname(fullPath);
      if (parentDir !== this.storageBase) {
        await this.cleanupEmptyDirectories(parentDir);
      }

      return true;
    } catch (error) {
      console.error("❌ Local Storage Delete Error:", error);
      throw error;
    }
  }

  /**
   * Clean up empty directories
   */
  async cleanupEmptyDirectories(dirPath) {
    try {
      // Don't try to clean up the main storage folders
      if (dirPath === this.storageBase) return;

      const files = await fs.readdir(dirPath);
      if (files.length === 0) {
        await fs.rmdir(dirPath);
        console.log(`🧹 Removed empty directory: ${dirPath}`);
      }
    } catch (error) {
      // Ignore errors during cleanup
      console.log(`⚠️ Could not clean up directory ${dirPath}:`, error.message);
    }
  }

  /**
   * Get file stats
   */
  async getFileStats(filePath) {
    try {
      const fullPath = path.join(this.storageBase, filePath);
      const stats = await fs.stat(fullPath);
      return {
        exists: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message,
      };
    }
  }

  /**
   * Get MIME type from filename
   */
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
      ".zip": "application/zip",
      ".rar": "application/x-rar-compressed",
    };

    return mimeTypes[ext] || "application/octet-stream";
  }
}

module.exports = new LocalSubOpStorage();
