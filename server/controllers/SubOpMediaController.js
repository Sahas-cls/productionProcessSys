const {
  SubOperationMedia,
  SubOperationImages,
  SubOperationTechPack,
  SubOperationFolder,
  SubOperation,
  Style,
  MainOperation,
} = require("../models");
const path = require("path");
const fs = require("fs");

// to upload video
exports.uploadVideo = async (req, res, next) => {
  console.log("Request body:", req.body);
  console.log(
    "File details:",
    req.file
      ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        }
      : "No file"
  );

  let filename = null;
  let filePath = null;
  let fileWriteSuccessful = false;
  let dbRecord = null;

  try {
    // Check if file uploaded
    if (!req.file) {
      console.log("❌ No file uploaded");
      return res.status(400).json({
        message: "No file uploaded",
        success: false,
      });
    }

    const { styleNo, moId, sopId, sopName, styleId } = req.body;

    // Validate required fields
    if (!styleNo || !moId || !sopId) {
      console.log("❌ Missing required fields:", { styleNo, moId, sopId });
      return res.status(400).json({
        message:
          "Missing required fields: styleNo, moId, and sopId are required",
        success: false,
      });
    }

    // Generate filename with timestamp
    const ext = path.extname(req.file.originalname).toLowerCase();
    const now = new Date();
    const dateTime = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getDate()).padStart(2, "0")}_${String(
      now.getHours()
    ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
      now.getSeconds()
    ).padStart(2, "0")}`;

    const sanitizedSopName = (sopName || "unknown")
      .replace(/[/\\?%*:|"<>]/g, "_")
      .replace(/\s+/g, "_");

    filename = `${styleNo}_${moId}_${sopId}_${sanitizedSopName}_${dateTime}${ext}`;
    console.log("📁 Generated filename:", filename);

    // Network path configuration
    const networkPath =
      "\\\\192.168.46.209\\Operation bullatin videos\\SubOpVideos";

    // Check network accessibility first - if not accessible, return error and exit
    console.log("🔍 Checking network path accessibility...");
    const isNetworkAccessible = await checkNetworkPath(networkPath);

    if (!isNetworkAccessible) {
      console.log(
        "❌ Network path not accessible - returning error to frontend"
      );
      return res.status(503).json({
        message:
          "Network storage is not accessible. Please check the network connection and try again.",
        success: false,
        error: "NETWORK_STORAGE_UNAVAILABLE",
      });
    }

    console.log("✅ Network path is accessible, proceeding with upload");
    filePath = path.join(networkPath, filename);
    console.log("🎯 Final file path:", filePath);

    // Save file to disk with proper error handling
    try {
      console.log("💾 Attempting to write file to network...");
      console.log(
        "📊 File buffer size:",
        req.file.buffer?.length || 0,
        "bytes"
      );

      if (!req.file.buffer || req.file.buffer.length === 0) {
        throw new Error("File buffer is empty");
      }

      fs.writeFileSync(filePath, req.file.buffer);
      console.log("✅ File write completed, verifying...");

      // Verify file was actually written
      const stats = fs.statSync(filePath);
      console.log("📈 File stats - Size:", stats.size, "bytes");

      if (stats.size > 0) {
        fileWriteSuccessful = true;
        console.log("✅ File saved successfully to network storage:", filePath);
      } else {
        console.error("❌ File write resulted in empty file");
        throw new Error("File write resulted in empty file (0 bytes)");
      }
    } catch (writeError) {
      console.error("❌ File write error to network:", writeError);
      throw new Error(
        `Failed to save video file to network storage: ${writeError.message}`
      );
    }

    // Only save to DB if file write was successful
    if (fileWriteSuccessful) {
      try {
        console.log("💾 Saving to database...");
        dbRecord = await SubOperationMedia.create({
          style_id: styleId,
          operation_id: moId,
          sub_operation_id: sopId,
          sub_operation_name: sopName || "null",
          media_url: filename,
          video_url: filename,
        });
        console.log("✅ Database record created with ID:", dbRecord.id);
      } catch (dbError) {
        console.error("❌ Database error:", dbError);
        throw new Error(`Database save failed: ${dbError.message}`);
      }
    }

    // Final success response
    console.log("🎉 Upload process completed successfully");
    res.status(201).json({
      message: "Video uploaded to network storage successfully",
      data: dbRecord,
      filename: filename,
      path: filePath,
      success: true,
    });
  } catch (error) {
    console.error("❌ Upload process failed:", error.message);

    // Clean up file if it was partially created but DB operation failed
    if (
      filename &&
      filePath &&
      fs.existsSync(filePath) &&
      !fileWriteSuccessful
    ) {
      try {
        console.log("🧹 Cleaning up file after error:", filePath);
        fs.unlinkSync(filePath);
        console.log("✅ File cleaned up successfully");
      } catch (cleanupError) {
        console.error("❌ Error deleting file during cleanup:", cleanupError);
      }
    }

    // Clean up DB record if file write failed but DB record was created
    if (dbRecord && !fileWriteSuccessful) {
      try {
        console.log("🧹 Cleaning up database record after error:", dbRecord.id);
        await SubOperationMedia.destroy({ where: { id: dbRecord.id } });
        console.log("✅ Database record cleaned up successfully");
      } catch (dbCleanupError) {
        console.error(
          "❌ Error deleting database record during cleanup:",
          dbCleanupError
        );
      }
    }

    // Determine appropriate status code and error message
    let statusCode = 500;
    let errorMessage = "Server error during file upload";

    if (
      error.message.includes("Missing required fields") ||
      error.message.includes("No file uploaded")
    ) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (
      error.message.includes("Failed to save video file to network storage")
    ) {
      statusCode = 500;
      errorMessage = "Failed to save video file to network storage";
    } else if (error.message.includes("Database save failed")) {
      statusCode = 500;
      errorMessage = "Failed to save record to database";
    } else if (
      error.name === "SequelizeError" ||
      error.name === "SequelizeValidationError"
    ) {
      statusCode = 500;
      errorMessage = "Database error occurred";
    }

    console.log(`📤 Sending error response: ${statusCode} - ${errorMessage}`);

    res.status(statusCode).json({
      message: errorMessage,
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      success: false,
    });
  }
};

// Helper function to check network path accessibility
async function checkNetworkPath(networkPath) {
  return new Promise((resolve) => {
    // First try fs.access
    fs.promises
      .access(networkPath)
      .then(() => {
        console.log("✅ Network path accessible via fs.access");
        resolve(true);
      })
      .catch((accessError) => {
        console.log(
          "❌ Network path not accessible via fs.access:",
          accessError.message
        );

        // Alternative check: try to list directory
        fs.promises
          .readdir(networkPath)
          .then((files) => {
            console.log(
              "✅ Network path accessible via readdir, found",
              files.length,
              "files"
            );
            resolve(true);
          })
          .catch((readError) => {
            console.log(
              "❌ Network path not accessible via readdir:",
              readError.message
            );
            resolve(false);
          });
      });
  });
}

// to get uploaded video according to the specific sub operation
exports.getVideos = async (req, res, next) => {
  //
  const { subOpId } = req.params;
  console.log("providing videos ------------ ", subOpId);
  if (isNaN(subOpId)) {
    return res
      .status(400)
      .json({ status: "error", message: "Invalid subOpId" });
  }
  try {
    const videos = await SubOperationMedia.findAll({
      where: { sub_operation_id: parseInt(subOpId) },
      include: [
        { model: Style, as: "style" },
        { model: SubOperation, as: "sub_operation" },
        { model: MainOperation, as: "main_operation" },
      ],
    });

    console.log("videos: ", videos);

    res.status(200).json({ status: "success", data: videos });
  } catch (error) {
    console.error("Error while fetching videos: ", error);
    return next(error);
  }
};

// to delete specific video from server
exports.deleteVideo = async (req, res, next) => {
  try {
    const { so_media_id } = req.params;

    // Validate required parameter
    if (!so_media_id) {
      return res.status(400).json({
        message: "Missing required parameter: so_media_id is required",
      });
    }

    // Find the video record in database
    const videoRecord = await SubOperationMedia.findByPk(so_media_id);

    if (!videoRecord) {
      return res.status(404).json({
        message: "Video record not found",
      });
    }

    // Extract filename from record
    const filename = videoRecord.media_url || videoRecord.video_url;

    if (!filename) {
      // Delete DB record even if filename is missing
      await SubOperationMedia.destroy({
        where: { so_media_id: so_media_id },
      });

      return res.status(200).json({
        message: "Database record deleted (no file found to delete)",
      });
    }

    // Construct file path (same as upload path)
    const filePath = path.join(
      "\\\\192.168.46.209\\Operation bullatin videos\\SubOpVideos",
      filename
    );

    // Check if file exists and delete it
    let fileDeleted = false;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      fileDeleted = true;
    }

    // Delete the database record
    await SubOperationMedia.destroy({
      where: { so_media_id: so_media_id },
    });

    res.status(200).json({
      message: "Video deleted successfully",
      details: {
        recordDeleted: true,
        fileDeleted: fileDeleted,
        filename: filename,
      },
    });
  } catch (error) {
    console.error("Delete error:", error);

    res.status(500).json({
      message: "Server error during deletion",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// !================================== image controllers

// to upload image
exports.uploadImage = async (req, res, next) => {
  console.log("Request body:", req.body);
  console.log(
    "File details:",
    req.file
      ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        }
      : "No file"
  );

  let filename = null;
  let filePath = null;
  let fileWriteSuccessful = false;
  let dbRecord = null;

  try {
    // Check if file uploaded
    if (!req.file) {
      console.log("❌ No file uploaded");
      return res.status(400).json({
        message: "No file uploaded",
        success: false,
      });
    }

    const { styleNo, moId, sopId, sopName, styleId } = req.body;

    // Validate required fields
    if (!styleNo || !moId || !sopId) {
      console.log("❌ Missing required fields:", { styleNo, moId, sopId });
      return res.status(400).json({
        message:
          "Missing required fields: styleNo, moId, and sopId are required",
        success: false,
      });
    }

    // Generate filename with timestamp
    const ext = path.extname(req.file.originalname).toLowerCase();
    const now = new Date();
    const dateTime = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getDate()).padStart(2, "0")}_${String(
      now.getHours()
    ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
      now.getSeconds()
    ).padStart(2, "0")}`;

    const sanitizedSopName = (sopName || "unknown")
      .replace(/[/\\?%*:|"<>]/g, "_")
      .replace(/\s+/g, "_");

    filename = `${styleNo}_${moId}_${sopId}_${sanitizedSopName}_${dateTime}${ext}`;
    console.log("📁 Generated filename:", filename);

    // Network path configuration for images
    const networkPath =
      "\\\\192.168.46.209\\Operation bullatin videos\\SubOpImages";

    // Check network accessibility first - if not accessible, return error and exit
    console.log("🔍 Checking network path accessibility...");
    const isNetworkAccessible = await checkNetworkPath(networkPath);

    if (!isNetworkAccessible) {
      console.log(
        "❌ Network path not accessible - returning error to frontend"
      );
      return res.status(503).json({
        message:
          "Network storage is not accessible. Please check the network connection and try again.",
        success: false,
        error: "NETWORK_STORAGE_UNAVAILABLE",
      });
    }

    console.log("✅ Network path is accessible, proceeding with upload");
    filePath = path.join(networkPath, filename);
    console.log("🎯 Final file path:", filePath);

    // Save file to disk with proper error handling
    try {
      console.log("💾 Attempting to write file to network...");
      console.log(
        "📊 File buffer size:",
        req.file.buffer?.length || 0,
        "bytes"
      );

      if (!req.file.buffer || req.file.buffer.length === 0) {
        throw new Error("File buffer is empty");
      }

      fs.writeFileSync(filePath, req.file.buffer);
      console.log("✅ File write completed, verifying...");

      // Verify file was actually written
      const stats = fs.statSync(filePath);
      console.log("📈 File stats - Size:", stats.size, "bytes");

      if (stats.size > 0) {
        fileWriteSuccessful = true;
        console.log("✅ File saved successfully to network storage:", filePath);
      } else {
        console.error("❌ File write resulted in empty file");
        throw new Error("File write resulted in empty file (0 bytes)");
      }
    } catch (writeError) {
      console.error("❌ File write error to network:", writeError);
      throw new Error(
        `Failed to save image file to network storage: ${writeError.message}`
      );
    }

    // Only save to DB if file write was successful
    if (fileWriteSuccessful) {
      try {
        console.log("💾 Saving to database...");
        dbRecord = await SubOperationImages.create({
          style_id: styleId || 1, // Default to 1 if not provided, adjust as needed
          operation_id: moId,
          sub_operation_id: sopId,
          sub_operation_name: sopName || "null",
          image_url: filename,
        });
        console.log("✅ Database record created with ID:", dbRecord.so_img_id);
      } catch (dbError) {
        console.error("❌ Database error:", dbError);
        throw new Error(`Database save failed: ${dbError.message}`);
      }
    }

    // Final success response
    console.log("🎉 Upload process completed successfully");
    res.status(201).json({
      message: "Image uploaded to network storage successfully",
      data: dbRecord,
      filename: filename,
      path: filePath,
      success: true,
    });
  } catch (error) {
    console.error("❌ Upload process failed:", error.message);

    // Clean up file if it was partially created but DB operation failed
    if (
      filename &&
      filePath &&
      fs.existsSync(filePath) &&
      !fileWriteSuccessful
    ) {
      try {
        console.log("🧹 Cleaning up file after error:", filePath);
        fs.unlinkSync(filePath);
        console.log("✅ File cleaned up successfully");
      } catch (cleanupError) {
        console.error("❌ Error deleting file during cleanup:", cleanupError);
      }
    }

    // Clean up DB record if file write failed but DB record was created
    if (dbRecord && !fileWriteSuccessful) {
      try {
        console.log(
          "🧹 Cleaning up database record after error:",
          dbRecord.so_img_id
        );
        await SubOperationImages.destroy({
          where: { so_img_id: dbRecord.so_img_id },
        });
        console.log("✅ Database record cleaned up successfully");
      } catch (dbCleanupError) {
        console.error(
          "❌ Error deleting database record during cleanup:",
          dbCleanupError
        );
      }
    }

    // Determine appropriate status code and error message
    let statusCode = 500;
    let errorMessage = "Server error during file upload";

    if (
      error.message.includes("Missing required fields") ||
      error.message.includes("No file uploaded")
    ) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (
      error.message.includes("Failed to save image file to network storage")
    ) {
      statusCode = 500;
      errorMessage = "Failed to save image file to network storage";
    } else if (error.message.includes("Database save failed")) {
      statusCode = 500;
      errorMessage = "Failed to save record to database";
    } else if (
      error.name === "SequelizeError" ||
      error.name === "SequelizeValidationError"
    ) {
      statusCode = 500;
      errorMessage = "Database error occurred";
    }

    console.log(`📤 Sending error response: ${statusCode} - ${errorMessage}`);

    res.status(statusCode).json({
      message: errorMessage,
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      success: false,
    });
  }
};

// to delete image
exports.deleteImage = async (req, res, next) => {
  const { so_img_id } = req.params;

  console.log("🗑️ Delete image request for ID:", so_img_id);

  let imageRecord = null;
  let filePath = null;

  try {
    // Validate image ID
    if (!so_img_id || isNaN(so_img_id)) {
      console.log("❌ Invalid image ID:", so_img_id);
      return res.status(400).json({
        message: "Valid image ID is required",
        success: false,
      });
    }

    // Find the image record in database
    try {
      console.log("🔍 Searching for image record in database...");
      imageRecord = await SubOperationImages.findOne({
        where: { so_img_id: so_img_id },
      });

      if (!imageRecord) {
        console.log("❌ Image record not found for ID:", so_img_id);
        return res.status(404).json({
          message: "Image record not found",
          success: false,
        });
      }

      console.log("✅ Image record found:", {
        id: imageRecord.so_img_id,
        filename: imageRecord.image_url,
        style_id: imageRecord.style_id,
        operation_id: imageRecord.operation_id,
      });
    } catch (findError) {
      console.error("❌ Database find error:", findError);
      throw new Error(`Database search failed: ${findError.message}`);
    }

    // Construct file path
    const networkPath =
      "\\\\192.168.46.209\\Operation bullatin videos\\SubOpImages";
    filePath = path.join(networkPath, imageRecord.image_url);
    console.log("📁 File path to delete:", filePath);

    // Check if file exists and delete it
    let fileDeleted = false;
    try {
      console.log("🔍 Checking if file exists...");
      if (fs.existsSync(filePath)) {
        console.log("✅ File exists, proceeding with deletion...");
        fs.unlinkSync(filePath);
        fileDeleted = true;
        console.log("✅ File deleted successfully from network storage");
      } else {
        console.log(
          "⚠️ File not found in storage, but will delete database record"
        );
      }
    } catch (fileError) {
      console.error("❌ File deletion error:", fileError);
      // Don't throw error here - we still want to delete the DB record
      console.log(
        "⚠️ File deletion failed, but continuing with database record deletion"
      );
    }

    // Delete database record
    try {
      console.log("💾 Deleting database record...");
      await SubOperationImages.destroy({
        where: { so_img_id: so_img_id },
      });
      console.log("✅ Database record deleted successfully");
    } catch (dbDeleteError) {
      console.error("❌ Database deletion error:", dbDeleteError);
      throw new Error(`Database deletion failed: ${dbDeleteError.message}`);
    }

    // Success response
    console.log("🎉 Image deletion completed successfully");
    res.json({
      message: "Image deleted successfully",
      data: {
        id: so_img_id,
        filename: imageRecord.image_url,
        fileDeleted: fileDeleted,
        recordDeleted: true,
      },
      success: true,
    });
  } catch (error) {
    console.error("❌ Delete process failed:", error.message);

    // Determine appropriate status code and error message
    let statusCode = 500;
    let errorMessage = "Server error during image deletion";

    if (error.message.includes("Database search failed")) {
      statusCode = 500;
      errorMessage = "Failed to find image record";
    } else if (error.message.includes("Database deletion failed")) {
      statusCode = 500;
      errorMessage = "Failed to delete image record from database";
    } else if (error.message.includes("Valid image ID is required")) {
      statusCode = 400;
      errorMessage = error.message;
    }

    console.log(`📤 Sending error response: ${statusCode} - ${errorMessage}`);

    res.status(statusCode).json({
      message: errorMessage,
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      success: false,
    });
  }
};

// !================================== tech pack controllers (excel)
// to upload tech pack
exports.uploadTechPack = async (req, res, next) => {
  console.log("Request body:", req.body);
  console.log(
    "File details:",
    req.file
      ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        }
      : "No file"
  );

  let filename = null;
  let filePath = null;
  let fileWriteSuccessful = false;
  let dbRecord = null;

  try {
    // Check if file uploaded
    if (!req.file) {
      console.log("❌ No file uploaded");
      return res.status(400).json({
        message: "No file uploaded",
        success: false,
      });
    }

    const { styleNo, moId, sopId, sopName, styleId } = req.body;

    // Validate required fields
    if (!styleNo || !moId || !sopId) {
      console.log("❌ Missing required fields:", { styleNo, moId, sopId });
      return res.status(400).json({
        message:
          "Missing required fields: styleNo, moId, and sopId are required",
        success: false,
      });
    }

    // Generate filename with timestamp
    const ext = path.extname(req.file.originalname).toLowerCase();
    const now = new Date();
    const dateTime = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getDate()).padStart(2, "0")}_${String(
      now.getHours()
    ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
      now.getSeconds()
    ).padStart(2, "0")}`;

    const sanitizedSopName = (sopName || "unknown")
      .replace(/[/\\?%*:|"<>]/g, "_")
      .replace(/\s+/g, "_");

    filename = `${styleNo}_${moId}_${sopId}_${sanitizedSopName}_${dateTime}${ext}`;
    console.log("📁 Generated filename:", filename);

    // Network path configuration for tech packs
    const networkPath =
      "\\\\192.168.46.209\\Operation bullatin videos\\SubOpTechPacks";

    // Check network accessibility first - if not accessible, return error and exit
    console.log("🔍 Checking network path accessibility...");
    const isNetworkAccessible = await checkNetworkPath(networkPath);

    if (!isNetworkAccessible) {
      console.log(
        "❌ Network path not accessible - returning error to frontend"
      );
      return res.status(503).json({
        message:
          "Network storage is not accessible. Please check the network connection and try again.",
        success: false,
        error: "NETWORK_STORAGE_UNAVAILABLE",
      });
    }

    console.log("✅ Network path is accessible, proceeding with upload");
    filePath = path.join(networkPath, filename);
    console.log("🎯 Final file path:", filePath);

    // Save file to disk with proper error handling
    try {
      console.log("💾 Attempting to write file to network...");
      console.log(
        "📊 File buffer size:",
        req.file.buffer?.length || 0,
        "bytes"
      );

      if (!req.file.buffer || req.file.buffer.length === 0) {
        throw new Error("File buffer is empty");
      }

      fs.writeFileSync(filePath, req.file.buffer);
      console.log("✅ File write completed, verifying...");

      // Verify file was actually written
      const stats = fs.statSync(filePath);
      console.log("📈 File stats - Size:", stats.size, "bytes");

      if (stats.size > 0) {
        fileWriteSuccessful = true;
        console.log("✅ File saved successfully to network storage:", filePath);
      } else {
        console.error("❌ File write resulted in empty file");
        throw new Error("File write resulted in empty file (0 bytes)");
      }
    } catch (writeError) {
      console.error("❌ File write error to network:", writeError);
      throw new Error(
        `Failed to save tech pack file to network storage: ${writeError.message}`
      );
    }

    // Only save to DB if file write was successful
    if (fileWriteSuccessful) {
      try {
        console.log("💾 Saving to database...");
        dbRecord = await SubOperationTechPack.create({
          style_id: styleId || 1,
          operation_id: moId,
          sub_operation_id: sopId,
          sub_operation_name: sopName || "null",
          tech_pack_url: filename,
        });
        console.log("✅ Database record created with ID:", dbRecord.so_tech_id);
      } catch (dbError) {
        console.error("❌ Database error:", dbError);
        throw new Error(`Database save failed: ${dbError.message}`);
      }
    }

    // Final success response
    console.log("🎉 Upload process completed successfully");
    res.status(201).json({
      message: "Tech pack uploaded to network storage successfully",
      data: dbRecord,
      filename: filename,
      path: filePath,
      success: true,
      processingResults: {
        sheetsProcessed: 1, // You can update this after actual Excel processing
        totalRows: 0, // Update after processing Excel data
      },
    });
  } catch (error) {
    console.error("❌ Upload process failed:", error.message);

    // Clean up file if it was partially created but DB operation failed
    if (
      filename &&
      filePath &&
      fs.existsSync(filePath) &&
      !fileWriteSuccessful
    ) {
      try {
        console.log("🧹 Cleaning up file after error:", filePath);
        fs.unlinkSync(filePath);
        console.log("✅ File cleaned up successfully");
      } catch (cleanupError) {
        console.error("❌ Error deleting file during cleanup:", cleanupError);
      }
    }

    // Clean up DB record if file write failed but DB record was created
    if (dbRecord && !fileWriteSuccessful) {
      try {
        console.log(
          "🧹 Cleaning up database record after error:",
          dbRecord.so_tech_id
        );
        await SubOperationTechPack.destroy({
          where: { so_tech_id: dbRecord.so_tech_id },
        });
        console.log("✅ Database record cleaned up successfully");
      } catch (dbCleanupError) {
        console.error(
          "❌ Error deleting database record during cleanup:",
          dbCleanupError
        );
      }
    }

    // Determine appropriate status code and error message
    let statusCode = 500;
    let errorMessage = "Server error during file upload";

    if (
      error.message.includes("Missing required fields") ||
      error.message.includes("No file uploaded")
    ) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (
      error.message.includes("Failed to save tech pack file to network storage")
    ) {
      statusCode = 500;
      errorMessage = "Failed to save tech pack file to network storage";
    } else if (error.message.includes("Database save failed")) {
      statusCode = 500;
      errorMessage = "Failed to save record to database";
    } else if (
      error.name === "SequelizeError" ||
      error.name === "SequelizeValidationError"
    ) {
      statusCode = 500;
      errorMessage = "Database error occurred";
    }

    console.log(`📤 Sending error response: ${statusCode} - ${errorMessage}`);

    res.status(statusCode).json({
      message: errorMessage,
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      success: false,
    });
  }
};

// Delete tech pack controller
exports.deleteTechPack = async (req, res, next) => {
  const { so_tech_id } = req.params;

  console.log("🗑️ Delete tech pack request for ID:", so_tech_id);

  let techPackRecord = null;
  let filePath = null;

  try {
    // Validate tech pack ID
    if (!so_tech_id || isNaN(so_tech_id)) {
      console.log("❌ Invalid tech pack ID:", so_tech_id);
      return res.status(400).json({
        message: "Valid tech pack ID is required",
        success: false,
      });
    }

    // Find the tech pack record in database
    try {
      console.log("🔍 Searching for tech pack record in database...");
      techPackRecord = await SubOperationTechPack.findOne({
        where: { so_tech_id: so_tech_id },
      });

      if (!techPackRecord) {
        console.log("❌ Tech pack record not found for ID:", so_tech_id);
        return res.status(404).json({
          message: "Tech pack record not found",
          success: false,
        });
      }

      console.log("✅ Tech pack record found:", {
        id: techPackRecord.so_tech_id,
        filename: techPackRecord.tech_pack_url,
        style_id: techPackRecord.style_id,
        operation_id: techPackRecord.operation_id,
      });
    } catch (findError) {
      console.error("❌ Database find error:", findError);
      throw new Error(`Database search failed: ${findError.message}`);
    }

    // Construct file path
    const networkPath =
      "\\\\192.168.46.209\\Operation bullatin videos\\SubOpTechPacks";
    filePath = path.join(networkPath, techPackRecord.tech_pack_url);
    console.log("📁 File path to delete:", filePath);

    // Check if file exists and delete it
    let fileDeleted = false;
    try {
      console.log("🔍 Checking if file exists...");
      if (fs.existsSync(filePath)) {
        console.log("✅ File exists, proceeding with deletion...");
        fs.unlinkSync(filePath);
        fileDeleted = true;
        console.log("✅ File deleted successfully from network storage");
      } else {
        console.log(
          "⚠️ File not found in storage, but will delete database record"
        );
      }
    } catch (fileError) {
      console.error("❌ File deletion error:", fileError);
      // Don't throw error here - we still want to delete the DB record
      console.log(
        "⚠️ File deletion failed, but continuing with database record deletion"
      );
    }

    // Delete database record
    try {
      console.log("💾 Deleting database record...");
      await SubOperationTechPack.destroy({
        where: { so_tech_id: so_tech_id },
      });
      console.log("✅ Database record deleted successfully");
    } catch (dbDeleteError) {
      console.error("❌ Database deletion error:", dbDeleteError);
      throw new Error(`Database deletion failed: ${dbDeleteError.message}`);
    }

    // Success response
    console.log("🎉 Tech pack deletion completed successfully");
    res.json({
      message: "Tech pack deleted successfully",
      data: {
        id: so_tech_id,
        filename: techPackRecord.tech_pack_url,
        fileDeleted: fileDeleted,
        recordDeleted: true,
      },
      success: true,
    });
  } catch (error) {
    console.error("❌ Delete process failed:", error.message);

    // Determine appropriate status code and error message
    let statusCode = 500;
    let errorMessage = "Server error during tech pack deletion";

    if (error.message.includes("Database search failed")) {
      statusCode = 500;
      errorMessage = "Failed to find tech pack record";
    } else if (error.message.includes("Database deletion failed")) {
      statusCode = 500;
      errorMessage = "Failed to delete tech pack record from database";
    } else if (error.message.includes("Valid tech pack ID is required")) {
      statusCode = 400;
      errorMessage = error.message;
    }

    console.log(`📤 Sending error response: ${statusCode} - ${errorMessage}`);

    res.status(statusCode).json({
      message: errorMessage,
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      success: false,
    });
  }
};

// !================================== folder controllers
// to upload folder (multiple documents)
exports.uploadFolder = async (req, res, next) => {
  console.log("Request body:", req.body);
  console.log(
    "Files details:",
    req.files ? `Total files: ${req.files.length}` : "No files"
  );

  try {
    // Check if files uploaded
    if (!req.files || req.files.length === 0) {
      console.log("❌ No files uploaded");
      return res.status(400).json({
        message: "No files uploaded",
        success: false,
      });
    }

    const { styleNo, moId, sopId, sopName, styleId, folderName } = req.body;

    // Validate required fields
    if (!styleNo || !moId || !sopId) {
      console.log("❌ Missing required fields:", { styleNo, moId, sopId });
      return res.status(400).json({
        message:
          "Missing required fields: styleNo, moId, and sopId are required",
        success: false,
      });
    }

    // Network path configuration for folders
    const networkPath =
      "\\\\192.168.46.209\\Operation bullatin videos\\SubOpFolders";

    // Check network accessibility first - if not accessible, return error and exit
    console.log("🔍 Checking network path accessibility...");
    const isNetworkAccessible = await checkNetworkPath(networkPath);

    if (!isNetworkAccessible) {
      console.log(
        "❌ Network path not accessible - returning error to frontend"
      );
      return res.status(503).json({
        message:
          "Network storage is not accessible. Please check the network connection and try again.",
        success: false,
        error: "NETWORK_STORAGE_UNAVAILABLE",
      });
    }

    console.log("✅ Network path is accessible, proceeding with upload");

    const uploadResults = [];
    const failedFiles = [];
    const dbRecords = [];

    // Process each file
    for (const [index, file] of req.files.entries()) {
      let filename = null;
      let filePath = null;
      let fileWriteSuccessful = false;
      let dbRecord = null;

      try {
        console.log(
          `\n📄 Processing file ${index + 1}/${req.files.length}: ${
            file.originalname
          }`
        );

        // Generate filename with timestamp and index for uniqueness
        const ext = path.extname(file.originalname).toLowerCase();
        const now = new Date();
        const dateTime = `${now.getFullYear()}${String(
          now.getMonth() + 1
        ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(
          now.getHours()
        ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
          now.getSeconds()
        ).padStart(2, "0")}`;

        const sanitizedSopName = (sopName || "unknown")
          .replace(/[/\\?%*:|"<>]/g, "_")
          .replace(/\s+/g, "_");

        // Include index to ensure unique filenames
        filename = `${styleNo}_${moId}_${sopId}_${sanitizedSopName}_${dateTime}_${index}${ext}`;
        console.log("📁 Generated filename:", filename);

        filePath = path.join(networkPath, filename);
        console.log("🎯 Final file path:", filePath);

        // Save file to disk with proper error handling
        try {
          console.log("💾 Attempting to write file to network...");
          console.log(
            "📊 File buffer size:",
            file.buffer?.length || 0,
            "bytes"
          );

          if (!file.buffer || file.buffer.length === 0) {
            throw new Error("File buffer is empty");
          }

          fs.writeFileSync(filePath, file.buffer);
          console.log("✅ File write completed, verifying...");

          // Verify file was actually written
          const stats = fs.statSync(filePath);
          console.log("📈 File stats - Size:", stats.size, "bytes");

          if (stats.size > 0) {
            fileWriteSuccessful = true;
            console.log("✅ File saved successfully to network storage");
          } else {
            console.error("❌ File write resulted in empty file");
            throw new Error("File write resulted in empty file (0 bytes)");
          }
        } catch (writeError) {
          console.error("❌ File write error to network:", writeError);
          throw new Error(
            `Failed to save file to network storage: ${writeError.message}`
          );
        }

        // Only save to DB if file write was successful
        if (fileWriteSuccessful) {
          try {
            console.log("💾 Saving to database...");
            dbRecord = await SubOperationFolder.create({
              style_id: styleId || 1,
              operation_id: moId,
              sub_operation_id: sopId,
              sub_operation_name: sopName || "null",
              folder_url: filename,
            });
            console.log(
              "✅ Database record created with ID:",
              dbRecord.so_folder_id
            );
            dbRecords.push(dbRecord);
          } catch (dbError) {
            console.error("❌ Database error:", dbError);
            throw new Error(`Database save failed: ${dbError.message}`);
          }
        }

        // Add to successful results
        uploadResults.push({
          id: dbRecord?.so_folder_id,
          originalName: file.originalname,
          savedName: filename,
          size: file.size,
          status: "success",
        });

        console.log(`✅ File ${index + 1} processed successfully`);
      } catch (fileError) {
        console.error(
          `❌ Failed to process file ${file.originalname}:`,
          fileError.message
        );

        // Clean up file if it was partially created
        if (
          filename &&
          filePath &&
          fs.existsSync(filePath) &&
          !fileWriteSuccessful
        ) {
          try {
            console.log("🧹 Cleaning up failed file:", filePath);
            fs.unlinkSync(filePath);
          } catch (cleanupError) {
            console.error(
              "❌ Error deleting file during cleanup:",
              cleanupError
            );
          }
        }

        failedFiles.push({
          originalName: file.originalname,
          error: fileError.message,
        });
      }
    }

    // Final response
    const totalProcessed = uploadResults.length + failedFiles.length;
    console.log(
      `\n📊 Upload Summary: ${uploadResults.length} successful, ${failedFiles.length} failed out of ${totalProcessed} total files`
    );

    if (uploadResults.length === 0) {
      // All files failed
      console.log("❌ All files failed to upload");
      return res.status(500).json({
        message: "All files failed to upload",
        success: false,
        failedFiles: failedFiles,
      });
    }

    const response = {
      message: `Folder upload completed: ${uploadResults.length} files uploaded successfully`,
      data: uploadResults,
      success: true,
      uploadResults: {
        filesProcessed: uploadResults.length,
        failedFiles: failedFiles.length,
        totalFiles: totalProcessed,
      },
    };

    // Add warnings if some files failed
    if (failedFiles.length > 0) {
      response.warnings = `${failedFiles.length} files failed to upload`;
      response.failedFiles = failedFiles;
    }

    console.log("🎉 Folder upload process completed");
    res.status(201).json(response);
  } catch (error) {
    console.error("❌ Upload process failed:", error.message);

    // Determine appropriate status code and error message
    let statusCode = 500;
    let errorMessage = "Server error during folder upload";

    if (
      error.message.includes("Missing required fields") ||
      error.message.includes("No files uploaded")
    ) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.message.includes("Network storage is not accessible")) {
      statusCode = 503;
      errorMessage = "Network storage is not accessible";
    }

    console.log(`📤 Sending error response: ${statusCode} - ${errorMessage}`);

    res.status(statusCode).json({
      message: errorMessage,
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      success: false,
    });
  }
};

// Delete folder document
exports.deleteFolderDocument = async (req, res, next) => {
  const { so_folder_id } = req.params;

  console.log("🗑️ Delete folder document request for ID:", so_folder_id);

  let folderRecord = null;
  let filePath = null;

  try {
    // Validate folder document ID
    if (!so_folder_id || isNaN(so_folder_id)) {
      console.log("❌ Invalid folder document ID:", so_folder_id);
      return res.status(400).json({
        message: "Valid folder document ID is required",
        success: false,
      });
    }

    // Find the folder record in database
    try {
      console.log("🔍 Searching for folder document record in database...");
      folderRecord = await SubOperationFolder.findOne({
        where: { so_folder_id: so_folder_id },
      });

      if (!folderRecord) {
        console.log(
          "❌ Folder document record not found for ID:",
          so_folder_id
        );
        return res.status(404).json({
          message: "Folder document record not found",
          success: false,
        });
      }

      console.log("✅ Folder document record found:", {
        id: folderRecord.so_folder_id,
        filename: folderRecord.folder_url,
        style_id: folderRecord.style_id,
        operation_id: folderRecord.operation_id,
      });
    } catch (findError) {
      console.error("❌ Database find error:", findError);
      throw new Error(`Database search failed: ${findError.message}`);
    }

    // Construct file path
    const networkPath =
      "\\\\192.168.46.209\\Operation bullatin videos\\SubOpFolders";
    filePath = path.join(networkPath, folderRecord.folder_url);
    console.log("📁 File path to delete:", filePath);

    // Check if file exists and delete it
    let fileDeleted = false;
    try {
      console.log("🔍 Checking if file exists...");
      if (fs.existsSync(filePath)) {
        console.log("✅ File exists, proceeding with deletion...");
        fs.unlinkSync(filePath);
        fileDeleted = true;
        console.log("✅ File deleted successfully from network storage");
      } else {
        console.log(
          "⚠️ File not found in storage, but will delete database record"
        );
      }
    } catch (fileError) {
      console.error("❌ File deletion error:", fileError);
      // Don't throw error here - we still want to delete the DB record
      console.log(
        "⚠️ File deletion failed, but continuing with database record deletion"
      );
    }

    // Delete database record
    try {
      console.log("💾 Deleting database record...");
      await SubOperationFolder.destroy({
        where: { so_folder_id: so_folder_id },
      });
      console.log("✅ Database record deleted successfully");
    } catch (dbDeleteError) {
      console.error("❌ Database deletion error:", dbDeleteError);
      throw new Error(`Database deletion failed: ${dbDeleteError.message}`);
    }

    // Success response
    console.log("🎉 Folder document deletion completed successfully");
    res.json({
      message: "Folder document deleted successfully",
      data: {
        id: so_folder_id,
        filename: folderRecord.folder_url,
        fileDeleted: fileDeleted,
        recordDeleted: true,
      },
      success: true,
    });
  } catch (error) {
    console.error("❌ Delete process failed:", error.message);

    // Determine appropriate status code and error message
    let statusCode = 500;
    let errorMessage = "Server error during folder document deletion";

    if (error.message.includes("Database search failed")) {
      statusCode = 500;
      errorMessage = "Failed to find folder document record";
    } else if (error.message.includes("Database deletion failed")) {
      statusCode = 500;
      errorMessage = "Failed to delete folder document record from database";
    } else if (error.message.includes("Valid folder document ID is required")) {
      statusCode = 400;
      errorMessage = error.message;
    }

    console.log(`📤 Sending error response: ${statusCode} - ${errorMessage}`);

    res.status(statusCode).json({
      message: errorMessage,
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      success: false,
    });
  }
};

// Delete multiple folder documents
exports.deleteMultipleFolderDocuments = async (req, res, next) => {
  const { documentIds } = req.body;

  console.log(
    "🗑️ Delete multiple folder documents request for IDs:",
    documentIds
  );

  try {
    // Validate document IDs
    if (
      !documentIds ||
      !Array.isArray(documentIds) ||
      documentIds.length === 0
    ) {
      console.log("❌ No document IDs provided");
      return res.status(400).json({
        message: "No document IDs provided",
        success: false,
      });
    }

    const deleteResults = [];
    const networkPath =
      "\\\\192.168.46.209\\Operation bullatin videos\\SubOpFolders";

    for (const docId of documentIds) {
      try {
        console.log(`\n🔍 Processing deletion for ID: ${docId}`);

        // Find the folder record
        const folderRecord = await SubOperationFolder.findOne({
          where: { so_folder_id: docId },
        });

        if (!folderRecord) {
          console.log("❌ Folder document record not found for ID:", docId);
          deleteResults.push({
            id: docId,
            status: "not_found",
            error: "Record not found",
          });
          continue;
        }

        let fileDeleted = false;
        const filePath = path.join(networkPath, folderRecord.folder_url);

        // Delete file from storage
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            fileDeleted = true;
            console.log("✅ File deleted from storage");
          } else {
            console.log("⚠️ File not found in storage");
          }
        } catch (fileError) {
          console.error("❌ File deletion error:", fileError);
        }

        // Delete database record
        await SubOperationFolder.destroy({
          where: { so_folder_id: docId },
        });

        console.log("✅ Database record deleted");
        deleteResults.push({
          id: docId,
          filename: folderRecord.folder_url,
          fileDeleted: fileDeleted,
          recordDeleted: true,
          status: "success",
        });
      } catch (error) {
        console.error(`❌ Error deleting document ${docId}:`, error.message);
        deleteResults.push({
          id: docId,
          status: "error",
          error: error.message,
        });
      }
    }

    const successfulDeletes = deleteResults.filter(
      (r) => r.status === "success"
    ).length;
    const failedDeletes = deleteResults.filter(
      (r) => r.status === "error"
    ).length;
    const notFound = deleteResults.filter(
      (r) => r.status === "not_found"
    ).length;

    console.log(
      `\n📊 Bulk delete summary: ${successfulDeletes} successful, ${failedDeletes} failed, ${notFound} not found`
    );

    res.json({
      message: `Bulk delete completed: ${successfulDeletes} documents deleted successfully`,
      success: true,
      results: deleteResults,
      summary: {
        total: documentIds.length,
        successful: successfulDeletes,
        failed: failedDeletes,
        notFound: notFound,
      },
    });
  } catch (error) {
    console.error("❌ Bulk delete process failed:", error.message);
    res.status(500).json({
      message: "Server error during bulk deletion",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      success: false,
    });
  }
};

// to get data
// In your SubOpMediaController.js

// Get all media by subOpId (combined endpoint)
// exports.getAllMedia = async (req, res) => {
//   try {
//     const { subOpId } = req.params;

//     // Fetch all media types in parallel
//     const [videos, images, techPacks, folders] = await Promise.all([
//       // Your existing methods for each type
//       this.getVideosData(subOpId),
//       this.getImagesData(subOpId),
//       this.getTechPacksData(subOpId),
//       this.getFolderDocumentsData(subOpId),
//     ]);

//     res.json({
//       success: true,
//       data: {
//         videos: videos.data || [],
//         images: images.data || [],
//         techPacks: techPacks.data || [],
//         folders: folders.data || [],
//       },
//       message: "All media fetched successfully",
//     });
//   } catch (error) {
//     console.error("Error fetching all media:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch media",
//     });
//   }
// };

// Individual get methods (you need to implement these based on your models)
exports.getImages = async (req, res) => {
  try {
    const { subOpId } = req.params;
    // Implementation to get images from SubOperationImages model
    const images = await SubOperationImages.findAll({
      where: { sub_operation_id: subOpId },
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: images,
      message: "Images fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching images:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch images",
    });
  }
};

exports.getTechPacks = async (req, res) => {
  try {
    const { subOpId } = req.params;
    // Implementation to get tech packs from SubOperationTechPack model
    const techPacks = await SubOperationTechPack.findAll({
      where: { sub_operation_id: subOpId },
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: techPacks,
      message: "Tech packs fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching tech packs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tech packs",
    });
  }
};

exports.getFolderDocuments = async (req, res) => {
  try {
    const { subOpId } = req.params;
    // Implementation to get folder documents from SubOperationFolder model
    const folders = await SubOperationFolder.findAll({
      where: { sub_operation_id: subOpId },
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: folders,
      message: "Folder documents fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching folder documents:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch folder documents",
    });
  }
};
