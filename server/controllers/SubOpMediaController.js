const {
  SubOperationMedia,
  SubOperation,
  Style,
  MainOperation,
} = require("../models");
const path = require("path");
const fs = require("fs");

// to upload video
exports.uploadVideo = async (req, res, next) => {
  console.log("Request body:", req.body);

  // Declare variables outside try block so they're accessible in catch
  let filename = null;
  let filePath = null;

  try {
    // Check if file uploaded
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { styleNo, moId, sopId, sopName, styleId } = req.body;

    // Validate required fields
    if (!styleNo || !moId || !sopId) {
      return res.status(400).json({
        message:
          "Missing required fields: styleNo, moId, and sopId are required",
      });
    }

    // Generate filename with timestamp - sanitize the sopName
    const ext = path.extname(req.file.originalname);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const dateTime = `${year}${month}${day}_${hours}${minutes}${seconds}`;

    // Sanitize the sopName to remove problematic characters
    const sanitizedSopName = sopName
      .replace(/[/\\?%*:|"<>]/g, "_") // Replace problematic characters with underscores
      .replace(/\s+/g, "_"); // Replace spaces with underscores

    filename = `${styleNo}_${moId}_${sopId}_${sanitizedSopName}_${dateTime}${ext}`;

    // Check if network path is accessible
    const networkPath =
      "\\\\192.168.46.209\\Operation bullatin videos\\SubOpVideos";

    try {
      // Try to access the network path
      await fs.promises.access(networkPath);
    } catch (accessError) {
      console.error("Network path not accessible:", accessError);

      // Fallback to local directory if network path is not accessible
      const localPath = path.join(__dirname, "..", "uploads", "SubOpVideos");

      // Create directory if it doesn't exist
      if (!fs.existsSync(localPath)) {
        fs.mkdirSync(localPath, { recursive: true });
      }

      filePath = path.join(localPath, filename);

      console.log("Using local fallback path:", filePath);
    } finally {
      // If filePath is not set (network path was accessible), use network path
      if (!filePath) {
        filePath = path.join(networkPath, filename);
      }
    }

    // Save file to disk
    fs.writeFileSync(filePath, req.file.buffer);
    console.log("File saved successfully at:", filePath);

    // Save into DB
    const newRecord = await SubOperationMedia.create({
      style_id: styleId,
      operation_id: moId,
      sub_operation_id: sopId,
      sub_operation_name: sopName || "null",
      media_url: filename,
      video_url: filename,
    });

    res.status(201).json({
      message: "Video uploaded and record saved successfully",
      data: newRecord,
      filename: filename,
      path: filePath,
    });
  } catch (error) {
    console.error("Upload error:", error);

    // Clean up file if it was created but DB operation failed
    if (filename && filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log("Cleaned up file after error:", filePath);
      } catch (e) {
        console.error("Error deleting file:", e);
      }
    }

    res.status(500).json({
      message: "Server error during file upload",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// to get uploaded video according to the specific sub operation
exports.getVideos = async (req, res, next) => {
  //
  const { subOpId } = req.params;
  console.log("providing videos ------------ ", subOpId);
  try {
    const videos = await SubOperationMedia.findAll({
      where: { sub_operation_id: parseInt(subOpId) },
      include: [
        { model: Style, as: "style" },
        { model: SubOperation, as: "sub_operation" },
        { model: MainOperation, as: "main_operation" },
      ],
    });

    // console.log(videos);

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
