const { SubOperationMedia } = require("../models");
const path = require("path");
const fs = require("fs");

exports.uploadVideo = async (req, res, next) => {
  console.log("Request body:", req.body);
  
  try {
    // Check if file uploaded
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { styleNo, moId, sopId, sopName, styleId } = req.body;

    // Validate required fields
    if (!styleNo || !moId || !sopId) {
      return res.status(400).json({ 
        message: "Missing required fields: styleNo, moId, and sopId are required" 
      });
    }

    // Generate filename with timestamp
    const ext = path.extname(req.file.originalname);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const dateTime = `${year}${month}${day}_${hours}${minutes}${seconds}`;
    
    const filename = `${styleNo}_${moId}_${sopId}_${sopName}_${dateTime}${ext}`;
    const filePath = path.join("\\\\192.168.46.209\\Operation bullatin videos\\SubOpVideos", filename);

    // Save file to disk
    fs.writeFileSync(filePath, req.file.buffer);

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
      filename: filename
    });
  } catch (error) {
    console.error("Upload error:", error);
    
    // Clean up file if it was created but DB operation failed
    if (filename && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath).catch(e => console.error("Error deleting file:", e));
    }
    
    res.status(500).json({ 
      message: "Server error", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
};