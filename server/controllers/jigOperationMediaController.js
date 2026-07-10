// controllers/jigOperationMediaController.js
const { group } = require("console");
const {
  JigOperationMedia,
  SubOperation,
  Style,
  User,
  JigFolder,
} = require("../models");
const b2JigOperationStorage = require("../utils/b2JigOperationStorage");
const path = require("path");

/**
 * Get all jig operation media with filters
 */
exports.getJigOperationMedia = async (req, res) => {
  try {
    const { page = 1, limit = 20, folderId, style_id, media_type } = req.query;

    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {
      is_active: true,
    };

    if (folderId) {
      whereClause.folderId = parseInt(folderId);
    }

    if (style_id) {
      whereClause.style_id = parseInt(style_id);
    }

    if (media_type && ["image", "video"].includes(media_type)) {
      whereClause.media_type = media_type;
    }

    const { count, rows } = await JigOperationMedia.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: SubOperation,
          as: "operation",
          attributes: [
            "sub_folderId",
            "sub_operation_name",
            "sub_operation_code",
          ],
        },
        {
          model: Style,
          as: "style",
          attributes: ["style_id", "style_no", "style_name"],
        },
        {
          model: User,
          as: "uploaded_user",
          attributes: ["user_id", "user_name", "user_email"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.status(200).json({
      success: true,
      data: {
        media: rows,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("❌ Get jig operation media error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch jig operation media",
      error: error.message,
    });
  }
};

/**
 * Upload jig operation media (image or video)
 */
exports.uploadJigOperationMedia = async (req, res) => {
  // Check if file exists
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  // Extract form data
  const {
    fileName,
    description,
    folderName, // folder ID from the form
    mediaType: bodyMediaType,
  } = req.body;

  // Validate required fields
  if (!fileName || !fileName.trim()) {
    return res.status(400).json({
      success: false,
      message: "File name is required",
    });
  }

  if (!folderName) {
    return res.status(400).json({
      success: false,
      message: "Folder ID is required",
    });
  }

  // if (!description || description.trim().length < 10) {
  //   return res.status(400).json({
  //     success: false,
  //     message: "Description is required and must be at least 10 characters",
  //   });
  // }

  // Determine media type from request or file
  const mediaType =
    bodyMediaType ||
    (req.file.mimetype.startsWith("video/") ? "video" : "image");

  try {
    // STEP 1: Validate folder exists
    const folderRecord = await JigFolder.findByPk(parseInt(folderName));
    if (!folderRecord) {
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      });
    }

    // STEP 2: Prepare filename
    const timestamp = Date.now();
    const originalExt = path.extname(req.file.originalname);
    const sanitizedName =
      `${fileName.trim().replace(/[^a-zA-Z0-9]/g, "_")}_${timestamp}${originalExt}`
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .substring(0, 200);

    console.log(`📤 Starting jig operation ${mediaType} upload:`, {
      folderId: folderName,
      fileName: fileName,
      originalName: req.file.originalname,
      generatedName: sanitizedName,
      size: req.file.size,
      mediaType: mediaType,
    });

    // STEP 3: Upload to B2
    const uploadResult = await b2JigOperationStorage.uploadJigOperationMedia(
      req.file.buffer,
      sanitizedName,
      mediaType,
    );

    // STEP 4: Save to database
    const dbRecord = await JigOperationMedia.create({
      file_name: req.file.originalname,
      media_url: uploadResult.filePath,
      b2_file_id: uploadResult.fileId,
      file_size: req.file.size,
      mime_type: req.file.mimetype.split(";")[0],
      media_type: mediaType,
      description: description.trim(),
      folder_id: parseInt(folderName),
      uploaded_by: req.user?.userId,
      is_active: true,
    });

    // STEP 5: Return success response
    res.status(201).json({
      success: true,
      message: `Jig operation ${mediaType} uploaded successfully`,
      data: {
        jig_media_id: dbRecord.jig_media_id,
        file_name: dbRecord.file_name,
        media_url: dbRecord.media_url,
        file_size: dbRecord.file_size,
        media_type: dbRecord.media_type,
        description: dbRecord.description,
        folder: {
          id: folderRecord.folder_id,
          name: folderRecord.folder_name,
        },
        uploaded_by: dbRecord.uploaded_by,
        created_at: dbRecord.created_at,
      },
    });
  } catch (error) {
    console.error(`❌ Jig operation ${mediaType} upload error:`, error);

    res.status(500).json({
      success: false,
      message: `Failed to upload jig operation ${mediaType}`,
      error: error.message,
    });
  }
};

/**
 * Delete jig operation media (soft delete)
 */
exports.deleteJigOperationMedia = async (req, res) => {
  const { media_id } = req.params;

  if (!media_id) {
    return res.status(400).json({
      success: false,
      message: "Media ID is required",
    });
  }

  try {
    // STEP 1: Find the media record
    const mediaRecord = await JigOperationMedia.findOne({
      where: {
        jig_media_id: parseInt(media_id),
        is_active: true,
      },
    });

    if (!mediaRecord) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    // STEP 2: Check ownership
    if (mediaRecord.uploaded_by !== req.user?.userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this media",
      });
    }

    // STEP 3: Delete from B2 (if exists)
    if (mediaRecord.b2_file_id && mediaRecord.media_url) {
      try {
        await b2JigOperationStorage.deleteFile(
          mediaRecord.b2_file_id,
          mediaRecord.media_url,
        );

        console.log(`✅ Deleted from B2: ${mediaRecord.media_url}`);
      } catch (b2Error) {
        // Ignore if file is already missing
        if (b2Error.code === "NotFound" || b2Error.statusCode === 404) {
          console.warn(
            `⚠️ File already missing from B2: ${mediaRecord.media_url}`,
          );
        } else {
          console.error("⚠️ Failed to delete file from B2:", b2Error.message);
        }
      }
    }

    // STEP 4: Hard delete database record
    await mediaRecord.destroy();

    // STEP 5: Success response
    return res.status(200).json({
      success: true,
      message: "Jig operation media deleted successfully.",
      data: {
        jig_media_id: mediaRecord.jig_media_id,
        file_name: mediaRecord.file_name,
        media_type: mediaRecord.media_type,
      },
    });
  } catch (error) {
    console.error("❌ Delete jig operation media error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete media.",
      error: error.message,
    });
  }
};

/**
 * Get specific jig operation media by ID
 */
exports.getJigOperationMediaById = async (req, res) => {
  const { media_id } = req.params;

  try {
    const mediaRecord = await JigOperationMedia.findOne({
      where: {
        jig_media_id: parseInt(media_id),
        is_active: true,
      },
      include: [
        {
          model: SubOperation,
          as: "operation",
          attributes: [
            "sub_folderId",
            "sub_operation_name",
            "sub_operation_code",
          ],
        },
        {
          model: Style,
          as: "style",
          attributes: ["style_id", "style_no", "style_name"],
        },
        {
          model: User,
          as: "uploaded_user",
          attributes: ["user_id", "user_name", "user_email"],
        },
      ],
    });

    if (!mediaRecord) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    res.status(200).json({
      success: true,
      data: mediaRecord,
    });
  } catch (error) {
    console.error("❌ Get jig operation media by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch media",
      error: error.message,
    });
  }
};

/**
 * Get media by operation ID
 */
exports.getMediaByFolder = async (req, res) => {
  console.log("from media controller: ", req.params);

  const { folderId } = req.params;
  const { media_type } = req.query;

  try {
    const media = await JigOperationMedia.findAll({
      where: { folder_id: folderId },
    });

    const videos = media.filter((m) => {
      return m.media_type === "video";
    });

    const images = media.filter((m) => {
      return m.media_type === "image";
    });

    res
      .status(200)
      .json({ status: "Ok", videos: videos || [], images: images || [] });
  } catch (error) {
    console.log(error);
  }
};

/**
 * Get media by style ID
 */
exports.getMediaByStyle = async (req, res) => {
  const { style_id } = req.params;
  const { media_type } = req.query;

  try {
    const whereClause = {
      style_id: parseInt(style_id),
      is_active: true,
    };

    if (media_type && ["image", "video"].includes(media_type)) {
      whereClause.media_type = media_type;
    }

    const mediaRecords = await JigOperationMedia.findAll({
      where: whereClause,
      include: [
        {
          model: SubOperation,
          as: "operation",
          attributes: [
            "sub_folderId",
            "sub_operation_name",
            "sub_operation_code",
          ],
        },
        {
          model: User,
          as: "uploaded_user",
          attributes: ["user_id", "user_name"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: mediaRecords,
      count: mediaRecords.length,
    });
  } catch (error) {
    console.error("❌ Get media by style error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch media",
      error: error.message,
    });
  }
};

// NOTE TO GET MEDIAS

// controllers/jigOperationMediaController.js
// Add these new functions to your existing controller

/**
 * Get operations that have media with their folder structure
 * Returns distinct operations with their media count
 */
exports.getOperationsWithMedia = async (req, res) => {
  try {
    const { media_type } = req.query; // Optional filter: 'image' or 'video'

    // Build where clause for media
    const mediaWhereClause = {
      is_active: true,
    };

    if (media_type && ["image", "video"].includes(media_type)) {
      mediaWhereClause.media_type = media_type;
    }

    // Get all operations with their media
    const operations = await SubOperation.findAll({
      attributes: [
        "sub_folderId",
        "sub_operation_name",
        "sub_operation_number",
      ],
      include: [
        {
          model: JigOperationMedia,
          as: "jig_operation_medias",
          attributes: [
            "jig_media_id",
            "file_name",
            "media_url",
            "media_type",
            "description",
            "created_at",
          ],
          where: mediaWhereClause,
          required: true, // Inner join - only operations that have media
          include: [
            {
              model: Style,
              as: "style",
              attributes: ["style_id", "style_no", "style_name"],
            },
          ],
        },
      ],
      order: [
        ["sub_operation_name", "ASC"],
        [
          { model: JigOperationMedia, as: "jig_operation_medias" },
          "created_at",
          "DESC",
        ],
      ],
    });

    // Group operations by name (combine operations with same name)
    const groupedOperations = operations.reduce((acc, op) => {
      const opData = op.toJSON();
      const operationName = opData.sub_operation_name || "Unnamed Operation";

      if (!acc[operationName]) {
        acc[operationName] = {
          operation_name: operationName,
          folderIds: [],
          operation_numbers: [],
          total_media: 0,
          styles: new Map(), // Use Map to avoid duplicates
          all_media: [],
          media_types: {
            image: 0,
            video: 0,
          },
        };
      }

      // Add operation details
      acc[operationName].folderIds.push(opData.sub_folderId);
      if (opData.sub_operation_number) {
        acc[operationName].operation_numbers.push(opData.sub_operation_number);
      }

      // Process media items
      const mediaItems = opData.jig_operation_medias || [];
      acc[operationName].total_media += mediaItems.length;

      // Add all media to the combined list
      mediaItems.forEach((media) => {
        acc[operationName].all_media.push({
          ...media,
          folderId: opData.sub_folderId,
        });

        // Count media by type
        if (media.media_type === "image") {
          acc[operationName].media_types.image += 1;
        } else if (media.media_type === "video") {
          acc[operationName].media_types.video += 1;
        }

        // Collect styles (avoid duplicates)
        if (media.style) {
          const styleKey = media.style.style_id;
          if (!acc[operationName].styles.has(styleKey)) {
            acc[operationName].styles.set(styleKey, {
              style_id: media.style.style_id,
              style_no: media.style.style_no,
              style_name: media.style.style_name,
            });
          }
        }
      });

      return acc;
    }, {});

    // Convert grouped operations to array format
    const formattedResult = Object.values(groupedOperations).map((group) => ({
      operation_name: group.operation_name,
      folderIds: group.folderIds,
      operation_numbers: group.operation_numbers,
      operation_count: group.folderIds.length,
      total_media: group.total_media,
      media_types: group.media_types,
      styles: Array.from(group.styles.values()),
      media: group.all_media, // All media from all operations with this name
    }));

    // Sort by operation name
    formattedResult.sort((a, b) =>
      a.operation_name.localeCompare(b.operation_name),
    );

    res.status(200).json({
      success: true,
      data: formattedResult,
      total_groups: formattedResult.length,
      total_operations: operations.length,
    });
  } catch (error) {
    console.error("❌ Get operations with media error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch operations with media",
      error: error.message,
    });
  }
};

/**
 * Get all media for a specific operation
 */
exports.getMediaByOperationId = async (req, res) => {
  const { folderId } = req.params;
  const { media_type } = req.query;
  console.log("getting media 📸🎥🎥🎥");
  try {
    // Validate operation exists
    const operation = await SubOperation.findByPk(folderId, {
      attributes: ["sub_folderId", "sub_operation_name", "sub_operation_code"],
    });

    if (!operation) {
      return res.status(404).json({
        success: false,
        message: "Operation not found",
      });
    }

    // Build where clause
    const whereClause = {
      folderId: parseInt(folderId),
      is_active: true,
    };

    if (media_type && ["image", "video"].includes(media_type)) {
      whereClause.media_type = media_type;
    }

    // Get all media for this operation
    const media = await JigOperationMedia.findAll({
      where: whereClause,
      include: [
        {
          model: Style,
          as: "style",
          attributes: ["style_id", "style_no", "style_name"],
        },
        {
          model: User,
          as: "uploaded_user",
          attributes: ["user_id", "user_name"],
        },
      ],
      order: [
        ["media_type", "ASC"],
        ["created_at", "DESC"],
      ],
    });

    // Group media by type
    const images = media.filter((m) => m.media_type === "image");
    const videos = media.filter((m) => m.media_type === "video");

    res.status(200).json({
      success: true,
      data: {
        operation: {
          id: operation.sub_folderId,
          name: operation.sub_operation_name,
          code: operation.sub_operation_code,
        },
        total: media.length,
        images: images,
        videos: videos,
        all_media: media,
      },
    });
  } catch (error) {
    console.error("❌ Get media by operation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch media for operation",
      error: error.message,
    });
  }
};

/**
 * Get media by style for a specific operation
 */
exports.getMediaByOperationAndStyle = async (req, res) => {
  const { folderId, style_id } = req.params;
  const { media_type } = req.query;
  console.log("getting media 222 📸🎥🎥🎥");
  try {
    const whereClause = {
      folderId: parseInt(folderId),
      style_id: parseInt(style_id),
      is_active: true,
    };

    if (media_type && ["image", "video"].includes(media_type)) {
      whereClause.media_type = media_type;
    }

    const media = await JigOperationMedia.findAll({
      where: whereClause,
      include: [
        {
          model: Style,
          as: "style",
          attributes: ["style_id", "style_no", "style_name"],
        },
        {
          model: User,
          as: "uploaded_user",
          attributes: ["user_id", "user_name"],
        },
      ],
      order: [
        ["media_type", "ASC"],
        ["created_at", "DESC"],
      ],
    });

    const images = media.filter((m) => m.media_type === "image");
    const videos = media.filter((m) => m.media_type === "video");

    res.status(200).json({
      success: true,
      data: {
        total: media.length,
        images: images,
        videos: videos,
        all_media: media,
      },
    });
  } catch (error) {
    console.error("❌ Get media by operation and style error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch media",
      error: error.message,
    });
  }
};

/**
 * Get media grouped by operation name
 * This returns all operations grouped by their name
 */
exports.getOperationsWithMedia = async (req, res) => {
  try {
    const { media_type } = req.query;

    // Build where clause for media
    const mediaWhereClause = {
      is_active: true,
    };

    if (media_type && ["image", "video"].includes(media_type)) {
      mediaWhereClause.media_type = media_type;
    }

    // Get all operations with their media
    const operations = await SubOperation.findAll({
      attributes: [
        "sub_folderId",
        "sub_operation_name",
        "sub_operation_number",
      ],
      include: [
        {
          model: JigOperationMedia,
          as: "jig_operation_medias",
          attributes: [
            "jig_media_id",
            "file_name",
            "media_url",
            "media_type",
            "description",
            "created_at",
            "file_size",
          ],
          where: mediaWhereClause,
          required: true, // Only operations that have media
          include: [
            {
              model: Style,
              as: "style",
              attributes: ["style_id", "style_no", "style_name"],
            },
          ],
        },
      ],
      order: [
        ["sub_operation_name", "ASC"],
        [
          { model: JigOperationMedia, as: "jig_operation_medias" },
          "created_at",
          "DESC",
        ],
      ],
    });

    const groupedOperations = {};

    operations.forEach((op) => {
      const opData = op.toJSON();
      const operationName = opData.sub_operation_name || "Unnamed Operation";

      if (!groupedOperations[operationName]) {
        groupedOperations[operationName] = {
          operation_name: operationName,
          folderIds: [],
          operation_numbers: [],
          total_media: 0,
          media_types: {
            image: 0,
            video: 0,
          },
          styles: [],
          media: [],
        };
      }

      const group = groupedOperations[operationName];

      // Add operation details
      group.folderIds.push(opData.sub_folderId);
      if (opData.sub_operation_number) {
        group.operation_numbers.push(opData.sub_operation_number);
      }

      // Process media items
      const mediaItems = opData.jig_operation_medias || [];
      group.total_media += mediaItems.length;

      // Process each media item
      mediaItems.forEach((media) => {
        // Add media with operation info
        group.media.push({
          ...media,
          folderId: opData.sub_folderId,
        });

        // Count media types
        if (media.media_type === "image") {
          group.media_types.image += 1;
        } else if (media.media_type === "video") {
          group.media_types.video += 1;
        }

        // Add style if exists
        if (media.style) {
          const styleExists = group.styles.some(
            (s) => s.style_id === media.style.style_id,
          );
          if (!styleExists) {
            group.styles.push({
              style_id: media.style.style_id,
              style_no: media.style.style_no,
              style_name: media.style.style_name,
            });
          }
        }
      });
    });

    // Convert to array and add operation count
    const formattedResult = Object.values(groupedOperations).map((group) => ({
      ...group,
      operation_count: group.folderIds.length,
    }));

    // Sort by operation name
    formattedResult.sort((a, b) =>
      a.operation_name.localeCompare(b.operation_name),
    );

    res.status(200).json({
      success: true,
      data: formattedResult,
      total_groups: formattedResult.length,
      total_operations: operations.length,
    });
  } catch (error) {
    console.error("❌ Get operations with media error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch operations with media",
      error: error.message,
    });
  }
};

/**
 * Get all media for operations with the same name
 * This fetches media from ALL operations that share the same name
 */
exports.getMediaByOperationName = async (req, res) => {
  const { operation_name } = req.params;
  const { media_type } = req.query;

  try {
    // First find all operations with this name
    const operations = await SubOperation.findAll({
      where: {
        sub_operation_name: operation_name,
      },
      attributes: [
        "sub_folderId",
        "sub_operation_name",
        "sub_operation_number",
      ],
    });

    if (operations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No operations found with this name",
      });
    }

    const operationIds = operations.map((op) => op.sub_folderId);
    const operationInfo = operations.map((op) => ({
      id: op.sub_folderId,
      number: op.sub_operation_number,
    }));

    // Build where clause for media - use IN clause for multiple operation IDs
    const whereClause = {
      folderId: operationIds,
      is_active: true,
    };

    if (media_type && ["image", "video"].includes(media_type)) {
      whereClause.media_type = media_type;
    }

    // Get all media from all operations with this name
    const mediaRecords = await JigOperationMedia.findAll({
      where: whereClause,
      include: [
        {
          model: Style,
          as: "style",
          attributes: ["style_id", "style_no", "style_name"],
        },
        {
          model: User,
          as: "uploaded_user",
          attributes: ["user_id", "user_name"],
        },
        {
          model: SubOperation,
          as: "operation",
          attributes: [
            "sub_folderId",
            "sub_operation_name",
            "sub_operation_number",
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // Separate images and videos
    const images = mediaRecords.filter((item) => item.media_type === "image");
    const videos = mediaRecords.filter((item) => item.media_type === "video");

    res.status(200).json({
      success: true,
      data: {
        operation_name: operation_name,
        folderIds: operationIds,
        operation_info: operationInfo,
        operation_count: operations.length,
        total_media: mediaRecords.length,
        images: images,
        videos: videos,
        all_media: mediaRecords,
        media_types: {
          image: images.length,
          video: videos.length,
        },
      },
    });
  } catch (error) {
    console.error("❌ Get media by operation name error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch media",
      error: error.message,
    });
  }
};

// Keep the existing getMediaByOperationId for backward compatibility
exports.getMediaByOperationId = async (req, res) => {
  const { folderId } = req.params;
  const { media_type } = req.query;
  console.log("getting media 📸🎥🎥🎥");

  try {
    // Validate operation exists
    const operation = await SubOperation.findByPk(folderId, {
      attributes: [
        "sub_folderId",
        "sub_operation_name",
        "sub_operation_number",
      ],
    });

    if (!operation) {
      return res.status(404).json({
        success: false,
        message: "Operation not found",
      });
    }

    // Build where clause
    const whereClause = {
      folderId: parseInt(folderId),
      is_active: true,
    };

    if (media_type && ["image", "video"].includes(media_type)) {
      whereClause.media_type = media_type;
    }

    // Get all media for this operation
    const media = await JigOperationMedia.findAll({
      where: whereClause,
      include: [
        {
          model: Style,
          as: "style",
          attributes: ["style_id", "style_no", "style_name"],
        },
        {
          model: User,
          as: "uploaded_user",
          attributes: ["user_id", "user_name"],
        },
      ],
      order: [
        ["media_type", "ASC"],
        ["created_at", "DESC"],
      ],
    });

    // Group media by type
    const images = media.filter((m) => m.media_type === "image");
    const videos = media.filter((m) => m.media_type === "video");

    res.status(200).json({
      success: true,
      data: {
        operation: {
          id: operation.sub_folderId,
          name: operation.sub_operation_name,
          number: operation.sub_operation_number,
        },
        total: media.length,
        images: images,
        videos: videos,
        all_media: media,
      },
    });
  } catch (error) {
    console.error("❌ Get media by operation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch media for operation",
      error: error.message,
    });
  }
};
