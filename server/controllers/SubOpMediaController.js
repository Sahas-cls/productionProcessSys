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
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const fs = require("fs");
const axios = require("axios");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const b2SubOpStorage = require("../utils/b2SubOpStorage");
require("dotenv").config();

// Set the ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);


exports.uploadVideo = async (req, res, next) => {
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
  const ffmpeg = require("fluent-ffmpeg");
  const ffmpegPath = require("ffmpeg-static");
  const fs = require("fs");
  const axios = require("axios");
  const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
  const b2SubOpStorage = require("../utils/b2SubOpStorage");
  require("dotenv").config();

  // Set the ffmpeg path - THIS IS THE KEY LINE
  ffmpeg.setFfmpegPath(ffmpegPath);
  console.log("📤 [B2] Video upload request received");
  console.log("📋 Request body:", req.body);
  console.log(
    "📁 File details:",
    req.file
      ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          bufferSize: req.file.buffer?.length || 0,
        }
      : "No file",
  );

  let uploadResult = null;
  let dbRecord = null;
  let tempInputPath = null;
  let tempOutputPath = null;

  try {
    // Check if file uploaded
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
        success: false,
      });
    }

    const { styleNo, moId, sopId, sopName, subOpId } = req.body;

    // Validate required fields
    if (!styleNo || !moId || !sopId || !subOpId) {
      return res.status(400).json({
        message: "Missing required fields: styleNo, moId, sopId, subOpId",
        success: false,
        received: { styleNo, moId, sopId, subOpId },
      });
    }

    // ==================== VALIDATE FOREIGN KEYS ====================
    // Lookup style_id from styleNo
    const styleRecord = await Style.findOne({ where: { style_no: styleNo } });
    if (!styleRecord) {
      return res.status(400).json({
        message: `Style with styleNo "${styleNo}" not found`,
        success: false,
      });
    }
    const styleIdDb = styleRecord.style_id;

    // Optionally: validate moId exists in Operations table
    const operationExists = await MainOperation.findByPk(moId);
    if (!operationExists) {
      return res.status(400).json({
        message: `Operation with id "${moId}" not found`,
        success: false,
      });
    }

    // Optionally: validate subOpId exists in SubOperations table
    const subOperationExists = await SubOperation.findByPk(subOpId);
    if (!subOperationExists) {
      return res.status(400).json({
        message: `Sub-operation with id "${subOpId}" not found`,
        success: false,
      });
    }

    // ==================== VIDEO PROCESSING ====================
    const isVideo = req.file.mimetype.startsWith("video/");
    const ext = path.extname(req.file.originalname).toLowerCase();
    let processedBuffer = req.file.buffer;
    let finalFilename = "";
    let wasNormalized = false;
    let rotationApplied = null;

    if (isVideo) {
      try {
        const tempDir = path.join(__dirname, "../temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        tempInputPath = path.join(tempDir, `input_${Date.now()}${ext}`);
        tempOutputPath = path.join(tempDir, `output_${Date.now()}${ext}`);
        await fs.promises.writeFile(tempInputPath, req.file.buffer);

        // Detect rotation metadata and get rotation value
        const rotationInfo = await new Promise((resolve) => {
          ffmpeg.ffprobe(tempInputPath, (err, metadata) => {
            if (err) return resolve({ hasRotation: false, rotation: 0 });

            const videoStream = metadata.streams?.find(
              (s) => s.codec_type === "video",
            );

            // Check various places where rotation might be stored
            let rotation = 0;
            if (videoStream?.tags?.rotate) {
              rotation = parseInt(videoStream.tags.rotate);
            } else if (videoStream?.side_data_list) {
              const rotateData = videoStream.side_data_list.find(
                (sd) => sd.rotation !== undefined,
              );
              if (rotateData) rotation = rotateData.rotation;
            }

            // Also check display matrix side data
            if (videoStream?.side_data_list) {
              const displayMatrix = videoStream.side_data_list.find(
                (sd) => sd.displaymatrix,
              );
              // Parse display matrix if needed for complex rotations
            }

            resolve({
              hasRotation: rotation !== 0,
              rotation: rotation,
            });
          });
        });

        // ALWAYS physically rotate for web compatibility if rotation detected
        if (rotationInfo.hasRotation) {
          console.log(
            `🔄 Detected rotation: ${rotationInfo.rotation}°, applying physical rotation for web compatibility`,
          );

          try {
            // Determine correct transpose filter based on rotation
            // transpose=1 : 90° clockwise
            // transpose=2 : 90° counter-clockwise
            // transpose=0 : 90° counter-clockwise + vertical flip (rare)
            // transpose=3 : 90° clockwise + vertical flip (rare)

            let transposeFilter = "transpose=1"; // default 90° clockwise

            if (rotationInfo.rotation === 90) {
              transposeFilter = "transpose=1"; // 90° clockwise
            } else if (
              rotationInfo.rotation === 270 ||
              rotationInfo.rotation === -90
            ) {
              transposeFilter = "transpose=2"; // 90° counter-clockwise (for 270°)
            } else if (rotationInfo.rotation === 180) {
              // For 180° rotation, use hflip + vflip or transpose twice
              transposeFilter = "transpose=1,transpose=1"; // 90° twice = 180°
            }

            // ALWAYS use physical rotation with transcoding for web compatibility
            await new Promise((resolve, reject) => {
              ffmpeg(tempInputPath)
                .videoFilters(transposeFilter)
                .audioCodec("aac") // Ensure audio compatibility
                .videoCodec("libx264") // Ensure web-compatible video codec
                .outputOptions([
                  "-preset fast", // Balance speed and quality
                  "-crf 23", // Good quality, reasonable size
                  "-movflags +faststart", // Optimize for web streaming
                  "-map_metadata 0", // Preserve other metadata
                  "-metadata:s:v:0 rotate=0", // Explicitly remove rotation metadata
                ])
                .on("start", (commandLine) => {
                  console.log("FFmpeg command:", commandLine);
                })
                .on("end", () => {
                  console.log("✅ Video rotated successfully");
                  resolve();
                })
                .on("error", (err) => {
                  console.error("FFmpeg rotation error:", err);
                  reject(err);
                })
                .save(tempOutputPath);
            });

            // Read the processed file
            processedBuffer = await fs.promises.readFile(tempOutputPath);
            req.file.size = processedBuffer.length;
            wasNormalized = true;
            rotationApplied = rotationInfo.rotation;

            console.log(`✅ Video successfully rotated and optimized for web`);
          } catch (rotationError) {
            console.error(
              "❌ Rotation failed, falling back to metadata removal only:",
              rotationError.message,
            );

            // Fallback: at least try to remove rotation metadata
            try {
              await new Promise((resolve, reject) => {
                ffmpeg(tempInputPath)
                  .outputOptions([
                    "-c copy",
                    "-map_metadata 0",
                    "-metadata:s:v:0 rotate=0",
                  ])
                  .on("end", resolve)
                  .on("error", reject)
                  .save(tempOutputPath);
              });

              processedBuffer = await fs.promises.readFile(tempOutputPath);
              req.file.size = processedBuffer.length;
              wasNormalized = true;
              rotationApplied = "metadata_only";
              console.log(
                "⚠️ Removed rotation metadata only (video may still appear rotated in some players)",
              );
            } catch (fallbackError) {
              console.error(
                "❌ Even metadata removal failed:",
                fallbackError.message,
              );
              // Keep original buffer
            }
          }
        } else {
          console.log(
            "✅ No rotation detected, video orientation is web-compatible",
          );

          // Even if no rotation, ensure web optimization for consistent experience
          try {
            await new Promise((resolve, reject) => {
              ffmpeg(tempInputPath)
                .videoCodec("libx264")
                .audioCodec("aac")
                .outputOptions([
                  "-preset fast",
                  "-crf 23",
                  "-movflags +faststart",
                ])
                .on("end", resolve)
                .on("error", reject)
                .save(tempOutputPath);
            });

            processedBuffer = await fs.promises.readFile(tempOutputPath);
            req.file.size = processedBuffer.length;
            wasNormalized = true; // Still marked as processed for consistency
            console.log("✅ Video optimized for web playback");
          } catch (optimizeError) {
            console.log(
              "⚠️ Web optimization skipped, using original:",
              optimizeError.message,
            );
          }
        }
      } catch (err) {
        console.warn(
          "⚠️ Video processing failed, using original buffer:",
          err.message,
        );
      }
    }

    // ==================== GENERATE FILENAME ====================
    const now = new Date();
    const dateTime = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    const sanitizedSopName = (sopName || "unknown")
      .replace(/[/\\?%*:|"<>]/g, "_")
      .replace(/\s+/g, "_");

    // Add web-optimized indicator to filename if processed
    const webOptimizedSuffix = wasNormalized ? "_web_optimized" : "";
    finalFilename =
      req.file.generatedName ||
      `${styleNo}_${moId}_${sopId}_${sanitizedSopName}${webOptimizedSuffix}_${dateTime}${ext}`;

    if (!processedBuffer || processedBuffer.length === 0) {
      return res
        .status(400)
        .json({ message: "Processed file is empty", success: false });
    }

    // ==================== UPLOAD TO BACKBLAZE B2 ====================
    uploadResult = await b2SubOpStorage.uploadSubOpFile(
      processedBuffer,
      finalFilename,
      "video",
      subOpId,
    );

    //NOTE ==================== FORCE SIZE UNDER 100MB ====================
    const MAX_SIZE_MB = 95;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    if (processedBuffer.length > MAX_SIZE_BYTES) {
      console.log("🎯 Applying size control compression...");

      const getVideoDuration = () =>
        new Promise((resolve) => {
          ffmpeg.ffprobe(tempInputPath, (err, metadata) => {
            if (err) return resolve(60); // fallback duration
            const duration = metadata.format?.duration || 60;
            resolve(duration);
          });
        });

      const duration = await getVideoDuration();
      const audioBitrate = 128000; // 128k
      const targetSizeBits = MAX_SIZE_BYTES * 8;

      let videoBitrate = Math.floor(targetSizeBits / duration) - audioBitrate;

      // Clamp bitrate between 800k and 2500k
      videoBitrate = Math.max(800000, Math.min(videoBitrate, 2500000));

      const bitrateK = Math.floor(videoBitrate / 1000) + "k";

      console.log(`📉 Calculated video bitrate: ${bitrateK}`);

      const sizeControlledPath = path.join(
        path.dirname(tempOutputPath),
        `size_control_${Date.now()}.mp4`,
      );

      await new Promise((resolve, reject) => {
        ffmpeg(tempInputPath)
          .videoCodec("libx264")
          .audioCodec("aac")
          .outputOptions([
            "-preset veryfast",
            "-movflags +faststart",
            "-vf scale='min(1280,iw)':-2",
            "-b:v " + bitrateK,
            "-maxrate " + bitrateK,
            "-bufsize 2M",
            "-b:a 128k",
          ])
          .on("end", resolve)
          .on("error", reject)
          .save(sizeControlledPath);
      });

      let finalBuffer = await fs.promises.readFile(sizeControlledPath);

      // SECOND PASS IF STILL TOO BIG
      if (finalBuffer.length > MAX_SIZE_BYTES) {
        console.log("🔁 Second compression pass...");

        const reducedBitrate = Math.floor(videoBitrate * 0.8);
        const reducedBitrateK = Math.floor(reducedBitrate / 1000) + "k";

        const secondPassPath = path.join(
          path.dirname(tempOutputPath),
          `second_pass_${Date.now()}.mp4`,
        );

        await new Promise((resolve, reject) => {
          ffmpeg(tempInputPath)
            .videoCodec("libx264")
            .audioCodec("aac")
            .outputOptions([
              "-preset veryfast",
              "-movflags +faststart",
              "-vf scale='min(1280,iw)':-2",
              "-b:v " + reducedBitrateK,
              "-maxrate " + reducedBitrateK,
              "-bufsize 2M",
              "-b:a 128k",
            ])
            .on("end", resolve)
            .on("error", reject)
            .save(secondPassPath);
        });

        finalBuffer = await fs.promises.readFile(secondPassPath);
        await fs.promises.unlink(secondPassPath);
      }

      processedBuffer = finalBuffer;
      req.file.size = finalBuffer.length;

      await fs.promises.unlink(sizeControlledPath);

      console.log(
        `✅ Final compressed size: ${(processedBuffer.length / (1024 * 1024)).toFixed(2)} MB`,
      );
    }

    // ==================== SAVE TO DATABASE ====================
    dbRecord = await SubOperationMedia.create({
      style_id: styleIdDb,
      operation_id: moId,
      sub_operation_id: subOpId,
      sub_operation_name: sopName || null,
      media_url: uploadResult.filePath,
      video_url: uploadResult.filePath,
      b2_file_id: uploadResult.fileId,
      file_size: req.file.size,
      original_filename: req.file.originalname,
      uploaded_by: req.user?.userId || null,
      file_type: req.file.mimetype,
      processed_with_ffmpeg: wasNormalized,
      rotation_fixed: rotationApplied !== null,
      original_rotation: rotationApplied,
    });

    // ==================== CLEANUP TEMP FILES ====================
    try {
      [tempInputPath, tempOutputPath].forEach(async (p) => {
        if (p && fs.existsSync(p)) {
          await fs.promises.unlink(p);
          console.log(`🧹 Cleaned up temp file: ${p}`);
        }
      });
    } catch (cleanupError) {
      console.warn("⚠️ Temp file cleanup warning:", cleanupError.message);
    }

    // ==================== SUCCESS RESPONSE ====================
    res.status(201).json({
      message: "Video uploaded successfully",
      success: true,
      data: {
        so_media_id: dbRecord.so_media_id,
        media_url: uploadResult.filePath,
        video_url: uploadResult.filePath,
        video_url_proxy: `/api/b2-files/${uploadResult.filePath}`,
        file_name: uploadResult.fileName,
        original_filename: req.file.originalname,
        file_size: req.file.size,
        file_type: req.file.mimetype,
        sub_operation_name: dbRecord.sub_operation_name,
        uploaded_at: dbRecord.createdAt,
        b2_file_id: uploadResult.fileId,
        orientation_normalized: wasNormalized,
        rotation_fixed: rotationApplied !== null,
        web_optimized: true,
      },
      storage: {
        type: "backblaze_b2",
        bucket: process.env.B2_BUCKET_NAME,
        region: "eu-central-003",
      },
    });
  } catch (error) {
    console.error("❌ Unhandled error:", error);

    // Cleanup B2 file if uploaded
    if (uploadResult?.fileId) {
      try {
        await b2SubOpStorage.deleteFile(
          uploadResult.fileId,
          uploadResult.filePath,
        );
        console.log("🧹 Cleaned up B2 file after error");
      } catch (b2Error) {
        console.error("❌ Failed to cleanup B2 file:", b2Error.message);
      }
    }

    // Cleanup database record if created
    if (dbRecord?.so_media_id) {
      try {
        await SubOperationMedia.destroy({
          where: { so_media_id: dbRecord.so_media_id },
        });
        console.log("🧹 Cleaned up database record after error");
      } catch (dbError) {
        console.error("❌ Failed to cleanup database:", dbError.message);
      }
    }

    // Cleanup temp files
    try {
      [tempInputPath, tempOutputPath].forEach(async (p) => {
        if (p && fs.existsSync(p)) {
          await fs.promises.unlink(p);
          console.log(`🧹 Cleaned up temp file after error: ${p}`);
        }
      });
    } catch (cleanupError) {
      console.warn("⚠️ Temp file cleanup warning:", cleanupError.message);
    }

    res.status(500).json({
      message: "Failed to upload video",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      success: false,
    });
  }
};

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
          accessError.message,
        );

        // Alternative check: try to list directory
        fs.promises
          .readdir(networkPath)
          .then((files) => {
            console.log(
              "✅ Network path accessible via readdir, found",
              files.length,
              "files",
            );
            resolve(true);
          })
          .catch((readError) => {
            console.log(
              "❌ Network path not accessible via readdir:",
              readError.message,
            );
            resolve(false);
          });
      });
  });
}

// to get uploaded video according to the specific sub operation
exports.getVideos = async (req, res, next) => {
  const { subOpId } = req.params;
  console.log("📹 [B2] Fetching videos for subOpId:", subOpId);

  if (isNaN(subOpId)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid subOpId",
    });
  }

  try {
    const videos = await SubOperationMedia.findAll({
      where: { sub_operation_id: parseInt(subOpId) },
      include: [
        { model: Style, as: "style" },
        { model: SubOperation, as: "sub_operation" },
        { model: MainOperation, as: "main_operation" },
      ],
      order: [["createdAt", "DESC"]], // Newest first
    });

    console.log(`✅ Found ${videos.length} videos for subOpId ${subOpId}`);

    // Transform videos to include proxy URLs for frontend
    const videosWithUrls = videos.map((video) => {
      const videoData = video.toJSON();

      // Add proxy URL for frontend access
      if (videoData.media_url) {
        videoData.video_url_proxy = `/api/b2-files/${videoData.media_url}`;
      }

      // If you want to keep both URLs for reference
      videoData.video_url_original = videoData.media_url;

      // Optional: Add direct B2 URL if bucket is public
      // videoData.video_url_direct = `https://s3.eu-central-003.backblazeb2.com/${process.env.B2_BUCKET_NAME}/${videoData.media_url}`;

      return videoData;
    });

    res.status(200).json({
      status: "success",
      data: videosWithUrls,
      count: videos.length,
      storage_type: "backblaze_b2",
      proxy_base: "/api/b2-files/",
    });
  } catch (error) {
    console.error("❌ Error while fetching videos:", error);
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

    // Extract filename from record (adjust based on your field name)
    const filename = videoRecord.media_url || videoRecord.video_url;
    const bucketId = process.env.B2_BUCKET_ID || "Guston-test bucket";

    // Initialize Backblaze B2 client
    const B2 = require("backblaze-b2");
    const b2 = new B2({
      applicationKeyId: process.env.B2_KEY_ID,
      applicationKey: process.env.B2_APPLICATION_KEY,
    });

    let fileDeleted = false;
    let b2FileId = null;

    // Check if we have a Backblaze file reference
    if (videoRecord.b2_file_id) {
      b2FileId = videoRecord.b2_file_id;
    }

    // Delete from Backblaze B2 if filename exists
    if (filename || b2FileId) {
      try {
        // Authorize with B2
        await b2.authorize();

        // If we have a fileId (most reliable way to delete)
        if (b2FileId) {
          await b2.deleteFileVersion({
            fileId: b2FileId,
            fileName: filename || videoRecord.original_filename,
          });
          fileDeleted = true;
        }
        // Fallback: delete by filename if we don't have fileId
        else if (filename) {
          // First, get file info to obtain fileId
          const listResponse = await b2.listFileNames({
            bucketId: bucketId,
            startFileName: filename,
            maxFileCount: 1,
          });

          if (listResponse.data.files.length > 0) {
            const fileInfo = listResponse.data.files[0];
            await b2.deleteFileVersion({
              fileId: fileInfo.fileId,
              fileName: fileInfo.fileName,
            });
            fileDeleted = true;
          }
        }
      } catch (b2Error) {
        // If file not found in B2, that's okay - we'll still delete DB record
        if (b2Error.response && b2Error.response.status === 404) {
          console.log(
            "File not found in Backblaze B2, proceeding with DB deletion",
          );
        } else {
          console.error("Backblaze B2 deletion error:", b2Error);
          // Don't fail completely - we'll still try to delete the DB record
        }
      }
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
        storageProvider: "Backblaze B2",
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
  console.log("📤 [B2] Image upload request received");
  console.log("📋 Request body:", req.body);
  console.log(
    "📁 File details:",
    req.file
      ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          bufferSize: req.file.buffer?.length || 0,
        }
      : "No file",
  );

  let uploadResult = null;
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

    const { styleNo, moId, sopId, sopName, styleId, subOpId } = req.body;

    // Validate required fields
    if (!styleNo || !moId || !sopId || !subOpId) {
      console.log("❌ Missing required fields:", {
        styleNo,
        moId,
        sopId,
        subOpId,
      });
      return res.status(400).json({
        message:
          "Missing required fields: styleNo, moId, sopId, and subOpId are required",
        success: false,
      });
    }

    // Generate filename with timestamp
    const ext = path.extname(req.file.originalname).toLowerCase();
    const now = new Date();
    const dateTime = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0",
    )}${String(now.getDate()).padStart(2, "0")}_${String(
      now.getHours(),
    ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
      now.getSeconds(),
    ).padStart(2, "0")}`;

    const sanitizedSopName = (sopName || "unknown")
      .replace(/[/\\?%*:|"<>]/g, "_")
      .replace(/\s+/g, "_");

    // Generate filename - use generatedName from middleware if available
    const filename =
      req.file.generatedName ||
      `${styleNo}_${moId}_${sopId}_${sanitizedSopName}_${dateTime}${ext}`;

    console.log("📁 Generated filename:", filename);
    console.log("📊 File buffer size:", req.file.buffer?.length || 0, "bytes");

    // Validate file buffer
    if (!req.file.buffer || req.file.buffer.length === 0) {
      console.log("❌ File buffer is empty");
      return res.status(400).json({
        message: "Uploaded file is empty or corrupted",
        success: false,
      });
    }

    // ==================== UPLOAD TO BACKBLAZE B2 ====================
    console.log("☁️ Uploading to Backblaze B2...");

    try {
      // Upload file to B2 - using "image" type instead of "video"
      uploadResult = await b2SubOpStorage.uploadSubOpFile(
        req.file.buffer,
        filename,
        "image", // Changed to "image" for folder organization
        subOpId, // subOpId for folder organization
      );

      console.log("✅ B2 Upload Successful:", {
        filePath: uploadResult.filePath,
        fileId: uploadResult.fileId,
        fileName: uploadResult.fileName,
      });
    } catch (b2Error) {
      console.error("❌ B2 Upload Failed:", {
        error: b2Error.message,
        code: b2Error.code,
        stack: b2Error.stack?.split("\n")[0],
      });

      let errorMessage = "Failed to upload image to cloud storage";
      let statusCode = 500;

      if (
        b2Error.code === "AccessDenied" ||
        b2Error.code === "InvalidAccessKeyId"
      ) {
        errorMessage = "Cloud storage authentication failed";
        statusCode = 503;
      } else if (b2Error.code === "NoSuchBucket") {
        errorMessage = "Cloud storage bucket not found";
        statusCode = 503;
      } else if (
        b2Error.message.includes("ENOTFOUND") ||
        b2Error.message.includes("ECONNREFUSED")
      ) {
        errorMessage = "Cannot connect to cloud storage";
        statusCode = 503;
      }

      return res.status(statusCode).json({
        message: errorMessage,
        error:
          process.env.NODE_ENV === "development" ? b2Error.message : undefined,
        success: false,
        storage: "backblaze_b2",
      });
    }

    // ==================== SAVE TO DATABASE ====================
    console.log("💾 Saving to database...");

    try {
      // Assuming your image model is SubOperationImages
      dbRecord = await SubOperationImages.create({
        style_id: styleId || 1, // Default to 1 if not provided
        operation_id: moId,
        sub_operation_id: sopId,
        sub_operation_name: sopName || null,
        // Store B2 file paths
        image_url: uploadResult.filePath,
        // NEW FIELDS to match video structure:
        b2_file_id: uploadResult.fileId, // Store B2 file ID for deletion
        file_size: req.file.size,
        original_filename: req.file.originalname,
        uploaded_by: req.user?.userId || null,
        file_type: req.file.mimetype,
        // If you want to track subOpId separately:
        sub_op_id: subOpId,
      });

      console.log("✅ Database record created:", {
        so_img_id: dbRecord.so_img_id,
        image_url: dbRecord.image_url,
        b2_file_id: dbRecord.b2_file_id,
      });
    } catch (dbError) {
      console.error("❌ Database save failed:", dbError);

      // Attempt to delete from B2 since DB save failed
      if (uploadResult && uploadResult.fileId) {
        try {
          console.log("🧹 Cleaning up B2 file after DB failure...");
          await b2SubOpStorage.deleteFile(
            uploadResult.fileId,
            uploadResult.filePath,
          );
          console.log("✅ B2 file cleaned up");
        } catch (cleanupError) {
          console.error("❌ Failed to clean up B2 file:", cleanupError);
        }
      }

      return res.status(500).json({
        message: "Failed to save image record to database",
        error:
          process.env.NODE_ENV === "development" ? dbError.message : undefined,
        success: false,
      });
    }

    // ==================== SUCCESS RESP ====================
    console.log("🎉 Image upload completed successfully!");

    res.status(201).json({
      message: "Image uploaded to cloud storage successfully",
      success: true,
      data: {
        so_img_id: dbRecord.so_img_id,
        image_url: uploadResult.filePath,
        image_url_proxy: `/api/b2-files/${uploadResult.filePath}`, // Proxy URL for frontend
        file_name: uploadResult.fileName,
        original_filename: req.file.originalname,
        file_size: req.file.size,
        file_type: req.file.mimetype,
        sub_operation_name: dbRecord.sub_operation_name,
        uploaded_at: dbRecord.createdAt,
        b2_file_id: uploadResult.fileId,
      },
      storage: {
        type: "backblaze_b2",
        bucket: process.env.B2_BUCKET_NAME,
        region: "eu-central-003", // Adjust if needed
      },
    });
  } catch (error) {
    console.error("❌ Unhandled error in image upload:", {
      message: error.message,
      stack: error.stack,
    });

    // Final cleanup if anything went wrong
    if (uploadResult && uploadResult.fileId) {
      try {
        console.log("🧹 Final cleanup of B2 file...");
        await b2SubOpStorage.deleteFile(
          uploadResult.fileId,
          uploadResult.filePath,
        );
      } catch (cleanupError) {
        console.error("❌ Final cleanup failed:", cleanupError);
      }
    }

    // Clean up DB record if it was created
    if (dbRecord && dbRecord.so_img_id) {
      try {
        console.log("🧹 Final cleanup of database record...");
        await SubOperationImages.destroy({
          where: { so_img_id: dbRecord.so_img_id },
        });
      } catch (dbCleanupError) {
        console.error("❌ Database cleanup failed:", dbCleanupError);
      }
    }

    res.status(500).json({
      message: "Failed to upload image",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      success: false,
    });
  }
};

// Helper function to delete from Backblaze B2
async function deleteFromBackblazeB2(filename, fileId = null) {
  const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");

  const s3Client = new S3Client({
    endpoint: `https://s3.${
      process.env.B2_REGION || "us-west-002"
    }.backblazeb2.com`,
    region: process.env.B2_REGION || "us-west-002",
    credentials: {
      accessKeyId: process.env.B2_KEY_ID,
      secretAccessKey: process.env.B2_APPLICATION_KEY,
    },
    forcePathStyle: true,
  });

  const deleteParams = {
    Bucket: process.env.B2_BUCKET_NAME,
    Key: `images/${filename}`,
  };

  await s3Client.send(new DeleteObjectCommand(deleteParams));
}

// to delete image
exports.deleteImage = async (req, res, next) => {
  const { so_img_id } = req.params;

  console.log("🗑️ [B2] Delete image request for ID:", so_img_id);

  let imageRecord = null;
  let b2Deleted = false;
  let b2Error = null;

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
        attributes: [
          "so_img_id",
          "image_url",
          "b2_file_id",
          "sub_operation_name",
          "original_filename",
          "file_size",
          "style_id",
          "operation_id",
          "sub_operation_id",
        ],
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
        b2_file_id: imageRecord.b2_file_id,
        image_url: imageRecord.image_url,
        original_filename: imageRecord.original_filename,
        file_size: imageRecord.file_size,
        sub_operation_id: imageRecord.sub_operation_id,
      });
    } catch (findError) {
      console.error("❌ Database find error:", findError);
      throw new Error(`Database search failed: ${findError.message}`);
    }

    // ==================== DELETE FROM BACKBLAZE B2 ====================
    if (imageRecord.b2_file_id && imageRecord.image_url) {
      console.log("☁️ Deleting from Backblaze B2...");

      try {
        // Check if we have the b2SubOpStorage service
        if (!b2SubOpStorage || !b2SubOpStorage.deleteFile) {
          console.error("❌ B2 storage service not available");
          throw new Error("Cloud storage service unavailable");
        }

        await b2SubOpStorage.deleteFile(
          imageRecord.b2_file_id,
          imageRecord.image_url,
        );

        b2Deleted = true;
        console.log("✅ B2 deletion successful:", {
          fileId: imageRecord.b2_file_id,
          filePath: imageRecord.image_url,
        });
      } catch (b2DeleteError) {
        b2Error = b2DeleteError;
        console.error("⚠️ B2 deletion failed:", {
          error: b2DeleteError.message,
          code: b2DeleteError.code,
          fileId: imageRecord.b2_file_id,
        });

        // Check if it's a "not found" error - that's okay, file might already be deleted
        if (
          b2DeleteError.code === "NoSuchKey" ||
          b2DeleteError.message.includes("not found") ||
          b2DeleteError.message.includes("NoSuchFile")
        ) {
          console.log(
            "ℹ️ File not found in B2 (may have been deleted already)",
          );
          b2Deleted = true; // Consider it "deleted" for our purposes
        } else if (
          b2DeleteError.code === "AccessDenied" ||
          b2DeleteError.message.includes("InvalidAccessKeyId")
        ) {
          console.error("❌ B2 authentication failed - check credentials");
          // Don't throw - still delete DB record
        } else if (
          b2DeleteError.message.includes("ENOTFOUND") ||
          b2DeleteError.message.includes("ECONNREFUSED")
        ) {
          console.error("❌ Cannot connect to B2 - network issue");
          // Don't throw - still delete DB record
        }
      }
    } else {
      console.log("ℹ️ No B2 file ID or image URL found, skipping B2 deletion");
      console.log(
        "   B2 File ID:",
        imageRecord.b2_file_id ? "Exists" : "Missing",
      );
      console.log(
        "   Image URL:",
        imageRecord.image_url ? "Exists" : "Missing",
      );
    }

    // ==================== DELETE FROM DATABASE ====================
    let dbDeleted = false;
    try {
      console.log("💾 Deleting database record...");
      await SubOperationImages.destroy({
        where: { so_img_id: so_img_id },
      });
      dbDeleted = true;
      console.log("✅ Database record deleted successfully");
    } catch (dbDeleteError) {
      console.error("❌ Database deletion error:", dbDeleteError);

      // If DB deletion fails, but B2 deletion succeeded, we have an orphaned file
      if (b2Deleted) {
        console.error(
          "⚠️ WARNING: File deleted from B2 but database record remains!",
        );
        console.error("⚠️ Image data:", {
          b2_file_id: imageRecord.b2_file_id,
          image_url: imageRecord.image_url,
          original_filename: imageRecord.original_filename,
        });
      }

      throw new Error(`Database deletion failed: ${dbDeleteError.message}`);
    }

    // ==================== PREPARE RESPONSE ====================
    console.log("🎉 Image deletion process completed");

    const response = {
      message: "Image deleted successfully",
      success: true,
      data: {
        id: so_img_id,
        filename: imageRecord.original_filename || imageRecord.image_url,
        original_filename: imageRecord.original_filename,
        file_size: imageRecord.file_size,
        b2_file_id: imageRecord.b2_file_id,
        b2_deleted: b2Deleted,
        db_deleted: dbDeleted,
        storage_provider: "backblaze_b2",
      },
    };

    // Add warnings if B2 deletion had issues
    if (b2Error && !b2Deleted) {
      response.warning =
        "Image removed from database but cloud storage cleanup failed";
      response.warning_details = {
        message: b2Error.message,
        code: b2Error.code,
      };

      console.log("⚠️ Returning with warning:", response.warning);
    } else if (!imageRecord.b2_file_id) {
      response.note = "Image was stored without B2 file ID (legacy record)";
    }

    res.json(response);
  } catch (error) {
    console.error("❌ Delete process failed:", error.message);
    console.error("❌ Error stack:", error.stack);

    // Determine appropriate status code and error message
    let statusCode = 500;
    let errorMessage = "Server error during image deletion";

    if (error.message.includes("Database search failed")) {
      statusCode = 500;
      errorMessage = "Failed to find image record";
    } else if (error.message.includes("Database deletion failed")) {
      statusCode = 500;
      errorMessage = "Failed to delete image record from database";

      // If DB failed but B2 succeeded, add specific warning
      if (b2Deleted) {
        errorMessage +=
          " (WARNING: File was deleted from cloud storage but database record remains)";
      }
    } else if (error.message.includes("Valid image ID is required")) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.message.includes("Cloud storage service unavailable")) {
      statusCode = 503;
      errorMessage = "Cloud storage service is temporarily unavailable";
    }

    console.log(`📤 Sending error response: ${statusCode} - ${errorMessage}`);

    res.status(statusCode).json({
      message: errorMessage,
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      success: false,
      // Include debug info for failed deletions
      debug:
        process.env.NODE_ENV === "development"
          ? {
              image_id: so_img_id,
              b2_file_id: imageRecord?.b2_file_id,
              b2_deleted: b2Deleted,
              b2_error: b2Error?.message,
            }
          : undefined,
    });
  }
};

// !================================== tech pack controllers (excel)
exports.uploadTechPack = async (req, res, next) => {
  console.log("📤 [B2] Tech pack upload request received");

  let uploadResult = null;
  let dbRecord = null;

  try {
    /* -----------------------------------
       Validate File
    ----------------------------------- */

    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
        success: false,
      });
    }

    const { styleId, styleNo } = req.body;

    if (!styleId) {
      return res.status(400).json({
        message: "styleId is required",
        success: false,
      });
    }

    /* -----------------------------------
       Generate Filename
    ----------------------------------- */

    const ext = path.extname(req.file.originalname).toLowerCase();

    const now = new Date();
    const dateTime = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0",
    )}${String(now.getDate()).padStart(2, "0")}_${String(
      now.getHours(),
    ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
      now.getSeconds(),
    ).padStart(2, "0")}`;

    const filename =
      req.file.generatedName ||
      `${styleNo || "STYLE"}_TECHPACK_${dateTime}${ext}`;

    /* -----------------------------------
       Upload To Backblaze
    ----------------------------------- */

    uploadResult = await b2SubOpStorage.uploadSubOpFile(
      req.file.buffer,
      filename,
      "techpack",
      styleId, // folder by style
    );

    /* -----------------------------------
       Optional Excel Processing
    ----------------------------------- */

    let excelProcessingResults = null;

    if (ext === ".xlsx" || ext === ".xls") {
      try {
        excelProcessingResults = await processTechPackExcel(req.file.buffer);
      } catch (err) {
        excelProcessingResults = {
          sheetsProcessed: 0,
          totalRows: 0,
          error: err.message,
        };
      }
    }

    /* -----------------------------------
       Save Database Record
    ----------------------------------- */

    dbRecord = await SubOperationTechPack.create({
      style_id: styleId,
      tech_pack_url: uploadResult.filePath,
      b2_file_id: uploadResult.fileId,
      file_size: req.file.size,
      original_filename: req.file.originalname,
      uploaded_by: req.user?.userId || null,
      file_type: req.file.mimetype,
    });

    /* -----------------------------------
       Response
    ----------------------------------- */

    return res.status(201).json({
      message: "Tech pack uploaded successfully",
      success: true,
      data: {
        so_tech_id: dbRecord.so_tech_id,
        style_id: dbRecord.style_id,
        tech_pack_url: uploadResult.filePath,
        tech_pack_url_proxy: `/api/b2-files/${uploadResult.filePath}`,
        original_filename: dbRecord.original_filename,
        file_size: dbRecord.file_size,
        file_type: dbRecord.file_type,
        uploaded_at: dbRecord.createdAt,
        excel_processing: excelProcessingResults,
      },
    });
  } catch (error) {
    console.error("❌ Tech pack upload failed:", error);

    /* -----------------------------------
       Cleanup B2
    ----------------------------------- */

    if (uploadResult?.fileId) {
      try {
        await b2SubOpStorage.deleteFile(
          uploadResult.fileId,
          uploadResult.filePath,
        );
      } catch (err) {
        console.error("Cleanup failed:", err);
      }
    }

    /* -----------------------------------
       Cleanup DB
    ----------------------------------- */

    if (dbRecord?.so_tech_id) {
      await SubOperationTechPack.destroy({
        where: { so_tech_id: dbRecord.so_tech_id },
      });
    }

    return res.status(500).json({
      message: "Failed to upload tech pack",
      success: false,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Helper function to process Excel tech pack data (if needed)
async function processTechPackExcel(buffer) {
  try {
    const XLSX = require("xlsx");

    // Read the Excel file from buffer
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetNames = workbook.SheetNames;

    let totalRows = 0;
    const processedSheets = [];

    // Process each sheet
    for (const sheetName of sheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const rowCount = sheetData.length;

      processedSheets.push({
        name: sheetName,
        rows: rowCount,
        columns: sheetData[0]?.length || 0,
      });

      totalRows += rowCount;
    }

    return {
      sheetsProcessed: sheetNames.length,
      totalRows: totalRows,
      sheets: processedSheets,
      fileName: workbook.Props?.Title || "Unknown",
      processedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Excel processing error:", error);
    throw new Error(`Failed to process Excel file: ${error.message}`);
  }
}

// Delete tech pack controller
// exports.deleteTechPack = async (req, res, next) => {
//   const { so_tech_id } = req.params;

//   console.log("🗑️ Delete tech pack request for ID:", so_tech_id);

//   let techPackRecord = null;
//   let filePath = null;

//   try {
//     // Validate tech pack ID
//     if (!so_tech_id || isNaN(so_tech_id)) {
//       console.log("❌ Invalid tech pack ID:", so_tech_id);
//       return res.status(400).json({
//         message: "Valid tech pack ID is required",
//         success: false,
//       });
//     }

//     // Find the tech pack record in database
//     try {
//       console.log("🔍 Searching for tech pack record in database...");
//       techPackRecord = await SubOperationTechPack.findOne({
//         where: { so_tech_id: so_tech_id },
//       });

//       if (!techPackRecord) {
//         console.log("❌ Tech pack record not found for ID:", so_tech_id);
//         return res.status(404).json({
//           message: "Tech pack record not found",
//           success: false,
//         });
//       }

//       console.log("✅ Tech pack record found:", {
//         id: techPackRecord.so_tech_id,
//         filename: techPackRecord.tech_pack_url,
//         style_id: techPackRecord.style_id,
//         operation_id: techPackRecord.operation_id,
//       });
//     } catch (findError) {
//       console.error("❌ Database find error:", findError);
//       throw new Error(`Database search failed: ${findError.message}`);
//     }

//     // Construct file path
//     const networkPath =
//       "\\\\192.168.46.209\\Operation bullatin videos\\SubOpTechPacks";
//     filePath = path.join(networkPath, techPackRecord.tech_pack_url);
//     console.log("📁 File path to delete:", filePath);

//     // Check if file exists and delete it
//     let fileDeleted = false;
//     try {
//       console.log("🔍 Checking if file exists...");
//       if (fs.existsSync(filePath)) {
//         console.log("✅ File exists, proceeding with deletion...");
//         fs.unlinkSync(filePath);
//         fileDeleted = true;
//         console.log("✅ File deleted successfully from network storage");
//       } else {
//         console.log(
//           "⚠️ File not found in storage, but will delete database record"
//         );
//       }
//     } catch (fileError) {
//       console.error("❌ File deletion error:", fileError);
//       // Don't throw error here - we still want to delete the DB record
//       console.log(
//         "⚠️ File deletion failed, but continuing with database record deletion"
//       );
//     }

//     // Delete database record
//     try {
//       console.log("💾 Deleting database record...");
//       await SubOperationTechPack.destroy({
//         where: { so_tech_id: so_tech_id },
//       });
//       console.log("✅ Database record deleted successfully");
//     } catch (dbDeleteError) {
//       console.error("❌ Database deletion error:", dbDeleteError);
//       throw new Error(`Database deletion failed: ${dbDeleteError.message}`);
//     }

//     // Success response
//     console.log("🎉 Tech pack deletion completed successfully");
//     res.json({
//       message: "Tech pack deleted successfully",
//       data: {
//         id: so_tech_id,
//         filename: techPackRecord.tech_pack_url,
//         fileDeleted: fileDeleted,
//         recordDeleted: true,
//       },
//       success: true,
//     });
//   } catch (error) {
//     console.error("❌ Delete process failed:", error.message);

//     // Determine appropriate status code and error message
//     let statusCode = 500;
//     let errorMessage = "Server error during tech pack deletion";

//     if (error.message.includes("Database search failed")) {
//       statusCode = 500;
//       errorMessage = "Failed to find tech pack record";
//     } else if (error.message.includes("Database deletion failed")) {
//       statusCode = 500;
//       errorMessage = "Failed to delete tech pack record from database";
//     } else if (error.message.includes("Valid tech pack ID is required")) {
//       statusCode = 400;
//       errorMessage = error.message;
//     }

//     console.log(`📤 Sending error response: ${statusCode} - ${errorMessage}`);

//     res.status(statusCode).json({
//       message: errorMessage,
//       error:
//         process.env.NODE_ENV === "development"
//           ? error.message
//           : "Internal server error",
//       success: false,
//     });
//   }
// };

exports.deleteTechPack = async (req, res, next) => {
  const { so_tech_id } = req.params;

  console.log("🗑️ [B2] Delete tech pack request for ID:", so_tech_id);

  let techPackRecord = null;
  let b2Deleted = false;
  let b2Error = null;

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
        attributes: [
          "so_tech_id",
          "tech_pack_url",
          "b2_file_id",
          "sub_operation_name",
          "original_filename",
          "file_size",
          "style_id",
          "operation_id",
          "sub_operation_id",
        ],
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
        b2_file_id: techPackRecord.b2_file_id,
        tech_pack_url: techPackRecord.tech_pack_url,
        original_filename: techPackRecord.original_filename,
        file_size: techPackRecord.file_size,
        sub_op_id: techPackRecord.sub_op_id,
      });
    } catch (findError) {
      console.error("❌ Database find error:", findError);
      throw new Error(`Database search failed: ${findError.message}`);
    }

    // ==================== DELETE FROM BACKBLAZE B2 ====================
    if (techPackRecord.b2_file_id && techPackRecord.tech_pack_url) {
      console.log("☁️ Deleting from Backblaze B2...");

      try {
        await b2SubOpStorage.deleteFile(
          techPackRecord.b2_file_id,
          techPackRecord.tech_pack_url,
        );

        b2Deleted = true;
        console.log("✅ B2 deletion successful");
      } catch (b2DeleteError) {
        b2Error = b2DeleteError;
        console.error("⚠️ B2 deletion failed:", b2DeleteError.message);

        // Check if it's a "not found" error
        if (
          b2DeleteError.code === "NoSuchKey" ||
          b2DeleteError.message.includes("not found")
        ) {
          console.log(
            "ℹ️ File not found in B2 (may have been deleted already)",
          );
          b2Deleted = true;
        }
      }
    } else {
      console.log("ℹ️ No B2 file ID or tech pack URL, skipping B2 deletion");
    }

    // ==================== DELETE FROM DATABASE ====================
    let dbDeleted = false;
    try {
      console.log("💾 Deleting database record...");
      await SubOperationTechPack.destroy({
        where: { so_tech_id: so_tech_id },
      });
      dbDeleted = true;
      console.log("✅ Database record deleted successfully");
    } catch (dbDeleteError) {
      console.error("❌ Database deletion error:", dbDeleteError);
      throw new Error(`Database deletion failed: ${dbDeleteError.message}`);
    }

    // ==================== SUCCESS RESPONSE ====================
    console.log("🎉 Tech pack deletion completed");

    const response = {
      message: "Tech pack deleted successfully",
      success: true,
      data: {
        id: so_tech_id,
        filename:
          techPackRecord.original_filename || techPackRecord.tech_pack_url,
        b2_deleted: b2Deleted,
        db_deleted: dbDeleted,
        storage_provider: "backblaze_b2",
      },
    };

    // Add warnings if B2 deletion had issues
    if (b2Error && !b2Deleted) {
      response.warning =
        "Tech pack removed from database but cloud storage cleanup failed";
      response.warning_details = {
        message: b2Error.message,
        code: b2Error.code,
      };
    }

    res.json(response);
  } catch (error) {
    console.error("❌ Delete process failed:", error.message);

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
exports.uploadFolder = async (req, res) => {
  console.log("📤 [B2] Folder upload request received", req.body);

  try {
    /* -----------------------------------
       Validate Files
    ----------------------------------- */

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: "No files uploaded",
        success: false,
      });
    }

    const { styleId, styleNo, folderName } = req.body;

    if (!styleId) {
      return res.status(400).json({
        message: "styleId is required",
        success: false,
      });
    }

    console.log(
      `📦 Processing ${req.files.length} files for styleId: ${styleId}`,
    );

    const uploadResults = [];
    const failedFiles = [];
    const filesToCleanup = [];

    /* -----------------------------------
       Process Each File
    ----------------------------------- */

    for (const [index, file] of req.files.entries()) {
      let uploadResult;
      let dbRecord;

      try {
        const ext = path.extname(file.originalname).toLowerCase();

        const now = new Date();
        const dateTime = `${now.getFullYear()}${String(
          now.getMonth() + 1,
        ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(
          now.getHours(),
        ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
          now.getSeconds(),
        ).padStart(2, "0")}`;

        const filename = `${styleNo || "STYLE"}_${folderName || "FOLDER"}_${dateTime}_${index}${ext}`;

        if (!file.buffer || file.buffer.length === 0) {
          throw new Error("File buffer is empty");
        }

        /* ---------------- Upload to B2 ---------------- */

        uploadResult = await b2SubOpStorage.uploadSubOpFile(
          file.buffer,
          filename,
          "document",
          styleId, // store under style
        );

        filesToCleanup.push({
          fileId: uploadResult.fileId,
          filePath: uploadResult.filePath,
        });

        /* ---------------- Save DB ---------------- */

        dbRecord = await SubOperationFolder.create({
          style_id: styleId,
          folder_url: uploadResult.filePath,
          b2_file_id: uploadResult.fileId,
          file_size: file.size,
          original_filename: file.originalname,
          uploaded_by: req.user?.userId || null,
          file_type: file.mimetype,
        });

        uploadResults.push({
          id: dbRecord.so_folder_id,
          originalName: file.originalname,
          savedName: filename,
          filePath: uploadResult.filePath,
          size: file.size,
          type: file.mimetype,
          status: "success",
        });
      } catch (err) {
        console.error(`❌ File failed: ${file.originalname}`, err.message);

        failedFiles.push({
          originalName: file.originalname,
          error: err.message,
          status: "failed",
        });

        if (uploadResult?.fileId) {
          try {
            await b2SubOpStorage.deleteFile(
              uploadResult.fileId,
              uploadResult.filePath,
            );
          } catch (_) {}
        }
      }
    }

    /* -----------------------------------
       Final Response
    ----------------------------------- */

    if (uploadResults.length === 0) {
      return res.status(500).json({
        message: "All files failed to upload",
        success: false,
        failedFiles,
      });
    }

    return res.status(201).json({
      message: `${uploadResults.length} files uploaded successfully`,
      success: true,
      files: uploadResults,
      failedFilesCount: failedFiles.length,
    });
  } catch (error) {
    console.error("❌ Upload process failed:", error);

    return res.status(500).json({
      message: "Folder upload failed",
      success: false,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Delete folder document
// exports.deleteFolderDocument = async (req, res, next) => {
//   const { so_folder_id } = req.params;

//   console.log("🗑️ Delete folder document request for ID:", so_folder_id);

//   let folderRecord = null;
//   let filePath = null;

//   try {
//     // Validate folder document ID
//     if (!so_folder_id || isNaN(so_folder_id)) {
//       console.log("❌ Invalid folder document ID:", so_folder_id);
//       return res.status(400).json({
//         message: "Valid folder document ID is required",
//         success: false,
//       });
//     }

//     // Find the folder record in database
//     try {
//       console.log("🔍 Searching for folder document record in database...");
//       folderRecord = await SubOperationFolder.findOne({
//         where: { so_folder_id: so_folder_id },
//       });

//       if (!folderRecord) {
//         console.log(
//           "❌ Folder document record not found for ID:",
//           so_folder_id
//         );
//         return res.status(404).json({
//           message: "Folder document record not found",
//           success: false,
//         });
//       }

//       console.log("✅ Folder document record found:", {
//         id: folderRecord.so_folder_id,
//         filename: folderRecord.folder_url,
//         style_id: folderRecord.style_id,
//         operation_id: folderRecord.operation_id,
//       });
//     } catch (findError) {
//       console.error("❌ Database find error:", findError);
//       throw new Error(`Database search failed: ${findError.message}`);
//     }

//     // Construct file path
//     const networkPath =
//       "\\\\192.168.46.209\\Operation bullatin videos\\SubOpFolders";
//     filePath = path.join(networkPath, folderRecord.folder_url);
//     console.log("📁 File path to delete:", filePath);

//     // Check if file exists and delete it
//     let fileDeleted = false;
//     try {
//       console.log("🔍 Checking if file exists...");
//       if (fs.existsSync(filePath)) {
//         console.log("✅ File exists, proceeding with deletion...");
//         fs.unlinkSync(filePath);
//         fileDeleted = true;
//         console.log("✅ File deleted successfully from network storage");
//       } else {
//         console.log(
//           "⚠️ File not found in storage, but will delete database record"
//         );
//       }
//     } catch (fileError) {
//       console.error("❌ File deletion error:", fileError);
//       // Don't throw error here - we still want to delete the DB record
//       console.log(
//         "⚠️ File deletion failed, but continuing with database record deletion"
//       );
//     }

//     // Delete database record
//     try {
//       console.log("💾 Deleting database record...");
//       await SubOperationFolder.destroy({
//         where: { so_folder_id: so_folder_id },
//       });
//       console.log("✅ Database record deleted successfully");
//     } catch (dbDeleteError) {
//       console.error("❌ Database deletion error:", dbDeleteError);
//       throw new Error(`Database deletion failed: ${dbDeleteError.message}`);
//     }

//     // Success response
//     console.log("🎉 Folder document deletion completed successfully");
//     res.json({
//       message: "Folder document deleted successfully",
//       data: {
//         id: so_folder_id,
//         filename: folderRecord.folder_url,
//         fileDeleted: fileDeleted,
//         recordDeleted: true,
//       },
//       success: true,
//     });
//   } catch (error) {
//     console.error("❌ Delete process failed:", error.message);

//     // Determine appropriate status code and error message
//     let statusCode = 500;
//     let errorMessage = "Server error during folder document deletion";

//     if (error.message.includes("Database search failed")) {
//       statusCode = 500;
//       errorMessage = "Failed to find folder document record";
//     } else if (error.message.includes("Database deletion failed")) {
//       statusCode = 500;
//       errorMessage = "Failed to delete folder document record from database";
//     } else if (error.message.includes("Valid folder document ID is required")) {
//       statusCode = 400;
//       errorMessage = error.message;
//     }

//     console.log(`📤 Sending error response: ${statusCode} - ${errorMessage}`);

//     res.status(statusCode).json({
//       message: errorMessage,
//       error:
//         process.env.NODE_ENV === "development"
//           ? error.message
//           : "Internal server error",
//       success: false,
//     });
//   }
// };

exports.deleteFolderDocument = async (req, res, next) => {
  const { so_folder_id } = req.params;

  console.log("🗑️ [B2] Delete folder file request for ID:", so_folder_id);

  let folderFileRecord = null;
  let b2Deleted = false;
  let b2Error = null;

  try {
    // Validate folder file ID
    if (!so_folder_id || isNaN(so_folder_id)) {
      console.log("❌ Invalid folder file ID:", so_folder_id);
      return res.status(400).json({
        message: "Valid folder file ID is required",
        success: false,
      });
    }

    // Find the folder file record in database
    try {
      console.log("🔍 Searching for folder file record in database...");
      folderFileRecord = await SubOperationFolder.findOne({
        where: { so_folder_id: so_folder_id },
        attributes: [
          "so_folder_id",
          "folder_url",
          "b2_file_id",
          "sub_operation_name",
          "original_filename",
          "file_size",
          "style_id",
          "operation_id",
          "sub_operation_id",
        ],
      });

      if (!folderFileRecord) {
        console.log("❌ Folder file record not found for ID:", so_folder_id);
        return res.status(404).json({
          message: "Folder file record not found",
          success: false,
        });
      }

      console.log("✅ Folder file record found:", {
        id: folderFileRecord.so_folder_id,
        b2_file_id: folderFileRecord.b2_file_id,
        folder_url: folderFileRecord.folder_url,
        original_filename: folderFileRecord.original_filename,
        file_size: folderFileRecord.file_size,
        folder_name: folderFileRecord.folder_name,
      });
    } catch (findError) {
      console.error("❌ Database find error:", findError);
      throw new Error(`Database search failed: ${findError.message}`);
    }

    // ==================== DELETE FROM BACKBLAZE B2 ====================
    if (folderFileRecord.b2_file_id && folderFileRecord.folder_url) {
      console.log("☁️ Deleting from Backblaze B2...");

      try {
        await b2SubOpStorage.deleteFile(
          folderFileRecord.b2_file_id,
          folderFileRecord.folder_url,
        );

        b2Deleted = true;
        console.log("✅ B2 deletion successful");
      } catch (b2DeleteError) {
        b2Error = b2DeleteError;
        console.error("⚠️ B2 deletion failed:", b2DeleteError.message);

        // Check if it's a "not found" error
        if (
          b2DeleteError.code === "NoSuchKey" ||
          b2DeleteError.message.includes("not found")
        ) {
          console.log(
            "ℹ️ File not found in B2 (may have been deleted already)",
          );
          b2Deleted = true;
        }
      }
    } else {
      console.log("ℹ️ No B2 file ID or folder URL, skipping B2 deletion");
    }

    // ==================== DELETE FROM DATABASE ====================
    let dbDeleted = false;
    try {
      console.log("💾 Deleting database record...");
      await SubOperationFolder.destroy({
        where: { so_folder_id: so_folder_id },
      });
      dbDeleted = true;
      console.log("✅ Database record deleted successfully");
    } catch (dbDeleteError) {
      console.error("❌ Database deletion error:", dbDeleteError);
      throw new Error(`Database deletion failed: ${dbDeleteError.message}`);
    }

    // ==================== SUCCESS RESPONSE ====================
    console.log("🎉 Folder file deletion completed");

    const response = {
      message: "Folder file deleted successfully",
      success: true,
      data: {
        id: so_folder_id,
        filename:
          folderFileRecord.original_filename || folderFileRecord.folder_url,
        folder_name: folderFileRecord.folder_name,
        b2_deleted: b2Deleted,
        db_deleted: dbDeleted,
        storage_provider: "backblaze_b2",
      },
    };

    // Add warnings if B2 deletion had issues
    if (b2Error && !b2Deleted) {
      response.warning =
        "Folder file removed from database but cloud storage cleanup failed";
      response.warning_details = {
        message: b2Error.message,
        code: b2Error.code,
      };
    }

    res.json(response);
  } catch (error) {
    console.error("❌ Delete process failed:", error.message);

    let statusCode = 500;
    let errorMessage = "Server error during folder file deletion";

    if (error.message.includes("Database search failed")) {
      statusCode = 500;
      errorMessage = "Failed to find folder file record";
    } else if (error.message.includes("Database deletion failed")) {
      statusCode = 500;
      errorMessage = "Failed to delete folder file record from database";
    } else if (error.message.includes("Valid folder file ID is required")) {
      statusCode = 400;
      errorMessage = error.message;
    }

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
    documentIds,
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
      (r) => r.status === "success",
    ).length;
    const failedDeletes = deleteResults.filter(
      (r) => r.status === "error",
    ).length;
    const notFound = deleteResults.filter(
      (r) => r.status === "not_found",
    ).length;

    console.log(
      `\n📊 Bulk delete summary: ${successfulDeletes} successful, ${failedDeletes} failed, ${notFound} not found`,
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

    // Validate parameter
    if (!subOpId) {
      return res.status(400).json({
        success: false,
        message: "subOpId parameter is required",
      });
    }

    console.log(`📸 Fetching images for subOpId: ${subOpId}`);

    // Get images from database
    const images = await SubOperationImages.findAll({
      where: { sub_operation_id: subOpId }, // Using sub_op_id instead of sub_operation_id
      order: [["createdAt", "DESC"]],
      attributes: [
        "so_img_id",
        "sub_operation_id",
        "sub_operation_name",
        "image_url",
        "b2_file_id",
        "file_size",
        "original_filename",
        "file_type",
        "uploaded_by",
        "createdAt",
        "updatedAt",
      ],
    });

    console.log(`✅ Found ${images.length} images for subOpId: ${subOpId}`);

    // Generate B2 URLs for each image
    const imagesWithUrls = images.map((image) => {
      const imageData = image.toJSON();

      // Generate B2 public URL
      let publicUrl = imageData.public_url; // If already stored in DB

      if (!publicUrl && imageData.image_url) {
        // Construct B2 URL from image_url (which should be the B2 path)
        const bucketName = process.env.B2_BUCKET_NAME;
        const region = process.env.B2_REGION || "eu-central-003";

        // Check if image_url is already a full path
        if (imageData.image_url.startsWith("http")) {
          publicUrl = imageData.image_url;
        } else {
          // Construct URL - adjust based on your bucket configuration
          publicUrl = `https://${bucketName}.s3.${region}.backblazeb2.com/${imageData.image_url}`;
        }
      }

      // Add proxy URL for frontend access
      const proxyUrl = `/api/b2-files/${imageData.image_url}`;

      return {
        ...imageData,
        public_url: publicUrl,
        proxy_url: proxyUrl,
        // For compatibility with frontend
        direct_url: publicUrl,
        preview_url: proxyUrl, // Use proxy for preview to avoid CORS issues
      };
    });

    res.json({
      success: true,
      data: imagesWithUrls,
      count: images.length,
      message: "Images fetched successfully",
      storage: {
        type: "backblaze_b2",
        bucket: process.env.B2_BUCKET_NAME,
        region: process.env.B2_REGION || "eu-central-003",
      },
    });
  } catch (error) {
    console.error("❌ Error fetching images:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch images",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getStyleTechPacks = async (req, res) => {
  try {
    const { subOpId: styleId } = req.params;
    console.log("requested style id: ", styleId);
    // Validate parameter
    if (!styleId) {
      return res.status(400).json({
        success: false,
        message: "styleId parameter is required",
      });
    }

    console.log(`📋 Fetching tech packs for styleId: ${styleId}`);

    // Get tech packs from database - NOW BY STYLE_ID
    const techPacks = await SubOperationTechPack.findAll({
      where: { style_id: styleId },
      order: [["createdAt", "DESC"]],
      attributes: [
        "so_tech_id",
        "style_id",
        "tech_pack_url",
        "b2_file_id",
        "file_size",
        "original_filename",
        "file_type",
        "uploaded_by",
        "createdAt",
        "updatedAt",
      ],
    });

    console.log(
      `✅ Found ${techPacks.length} tech packs for styleId: ${styleId}`,
    );

    // Generate URLs for each tech pack
    const techPacksWithUrls = techPacks.map((techPack) => {
      const techPackData = techPack.toJSON();

      // Generate B2 URL
      let publicUrl = techPackData.public_url;

      if (!publicUrl && techPackData.tech_pack_url) {
        if (techPackData.tech_pack_url.startsWith("http")) {
          publicUrl = techPackData.tech_pack_url;
        } else {
          const bucketName = process.env.B2_BUCKET_NAME;
          const region = process.env.B2_REGION || "eu-central-003";
          publicUrl = `https://${bucketName}.s3.${region}.backblazeb2.com/${techPackData.tech_pack_url}`;
        }
      }

      // Add proxy URL for frontend access
      const proxyUrl = `/api/b2-files/${techPackData.tech_pack_url}`;

      // Determine file icon based on extension
      const fileIcon = getFileIcon(
        techPackData.original_filename || techPackData.tech_pack_url,
      );

      return {
        ...techPackData,
        public_url: publicUrl,
        proxy_url: proxyUrl,
        direct_url: publicUrl,
        preview_url: proxyUrl,
        file_icon: fileIcon,
        file_name:
          techPackData.original_filename ||
          techPackData.tech_pack_url?.split("/").pop() ||
          "techpack.xlsx",
        file_extension: getFileExtension(
          techPackData.original_filename || techPackData.tech_pack_url,
        ),
        file_size_formatted: formatFileSize(techPackData.file_size),
      };
    });

    res.json({
      success: true,
      data: techPacksWithUrls,
      count: techPacks.length,
      message: "Style tech packs fetched successfully",
      storage: {
        type: "backblaze_b2",
        bucket: process.env.B2_BUCKET_NAME,
        region: process.env.B2_REGION || "eu-central-003",
      },
    });
  } catch (error) {
    console.error("❌ Error fetching style tech packs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch style tech packs",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Helper function to get file icon
function getFileIcon(filename) {
  if (!filename) return "📄";

  const ext = getFileExtension(filename).toLowerCase();

  const iconMap = {
    ".xlsx": "📊",
    ".xls": "📊",
    ".csv": "📑",
    ".pdf": "📕",
    ".doc": "📘",
    ".docx": "📘",
    ".txt": "📝",
    ".zip": "🗜️",
    ".rar": "🗜️",
    ".7z": "🗜️",
  };

  return iconMap[ext] || "📄";
}

// Helper function to get file extension
function getFileExtension(filename) {
  if (!filename) return "";
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.substring(lastDot);
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Get folder documents.
exports.getFolderDocuments = async (req, res) => {
  try {
    const { styleId } = req.params;

    // Validate parameter
    if (!styleId) {
      return res.status(400).json({
        success: false,
        message: "styleId parameter is required",
      });
    }

    console.log(`📂 Fetching folder files for styleId: ${styleId}`);

    // Get folder files from database
    const folderFiles = await SubOperationFolder.findAll({
      where: { style_id: styleId },
      order: [["createdAt", "DESC"]],
      attributes: [
        "so_folder_id",
        "style_id",
        "folder_url",
        "b2_file_id",
        "file_size",
        "original_filename",
        "file_type",
        "uploaded_by",
        "createdAt",
        "updatedAt",
      ],
    });

    console.log(
      `✅ Found ${folderFiles.length} folder files for styleId: ${styleId}`,
    );

    // Generate URLs for each file
    const folderFilesWithUrls = folderFiles.map((folderFile) => {
      const folderFileData = folderFile.toJSON();

      // Generate B2 public URL
      let publicUrl = null;
      if (folderFileData.folder_url) {
        if (folderFileData.folder_url.startsWith("http")) {
          publicUrl = folderFileData.folder_url;
        } else {
          const bucketName = process.env.B2_BUCKET_NAME;
          const region = process.env.B2_REGION || "eu-central-003";

          publicUrl = `https://${bucketName}.s3.${region}.backblazeb2.com/${folderFileData.folder_url}`;
        }
      }

      // Proxy URL (optional)
      const proxyUrl = folderFileData.folder_url
        ? `/api/b2-files/${folderFileData.folder_url}`
        : null;

      // Helpers
      const fileName =
        folderFileData.original_filename ||
        folderFileData.folder_url?.split("/").pop() ||
        "file";

      return {
        ...folderFileData,

        // URLs
        public_url: publicUrl,
        proxy_url: proxyUrl,
        direct_url: publicUrl,
        preview_url: proxyUrl,

        // File info
        file_name: fileName,
        file_extension: getFileExtension(fileName),
        file_icon: getFileIcon(fileName),
        file_type_name: getFileType(folderFileData.file_type || fileName),

        // Human readable size
        file_size_formatted: formatFileSize(folderFileData.file_size),
      };
    });

    return res.json({
      success: true,
      data: folderFilesWithUrls,
      count: folderFiles.length,
      message: "Folder files fetched successfully",
      storage: {
        type: "backblaze_b2",
        bucket: process.env.B2_BUCKET_NAME,
        region: process.env.B2_REGION || "eu-central-003",
      },
    });
  } catch (error) {
    console.error("❌ Error fetching folder files:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch folder files",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Helper functions (add these or reuse from previous controllers)
function getFileIcon(filename) {
  if (!filename) return "📄";
  const ext = getFileExtension(filename).toLowerCase();
  const iconMap = {
    ".pdf": "📕",
    ".doc": "📘",
    ".docx": "📘",
    ".txt": "📝",
    ".zip": "🗜️",
    ".rar": "🗜️",
    ".7z": "🗜️",
    ".jpg": "🖼️",
    ".jpeg": "🖼️",
    ".png": "🖼️",
    ".gif": "🖼️",
    ".xlsx": "📊",
    ".xls": "📊",
    ".csv": "📑",
  };
  return iconMap[ext] || "📄";
}

function getFileType(mimeTypeOrFilename) {
  if (!mimeTypeOrFilename) return "Document";

  if (mimeTypeOrFilename.includes("/")) {
    // It's a MIME type
    const parts = mimeTypeOrFilename.split("/");
    return parts[1] ? parts[1].toUpperCase() : "Document";
  } else {
    // It's a filename
    const ext = getFileExtension(mimeTypeOrFilename).toLowerCase();
    const typeMap = {
      ".pdf": "PDF Document",
      ".doc": "Word Document",
      ".docx": "Word Document",
      ".txt": "Text File",
      ".zip": "Archive",
      ".rar": "Archive",
      ".7z": "Archive",
      ".jpg": "Image",
      ".jpeg": "Image",
      ".png": "Image",
      ".gif": "Image",
      ".xlsx": "Excel Spreadsheet",
      ".xls": "Excel Spreadsheet",
      ".csv": "CSV File",
    };
    return typeMap[ext] || "Document";
  }
}
