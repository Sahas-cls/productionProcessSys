// controllers/jigOperationMediaController.js
const { group } = require("console");
const { JigOperationMedia, SubOperation, Style, User } = require("../models");
const b2JigOperationStorage = require("../utils/b2JigOperationStorage");
const path = require("path");

/**
 * Get all jig operation media with filters
 */
exports.getJigOperationMedia = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      operation_id,
      style_id,
      media_type,
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {
      is_active: true,
    };

    if (operation_id) {
      whereClause.operation_id = parseInt(operation_id);
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
            "sub_operation_id",
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
    operation,
    styleNo,
    description,
    mediaType: bodyMediaType, // Rename to avoid conflict
  } = req.body;

  // Validate required fields
  if (!operation) {
    return res.status(400).json({
      success: false,
      message: "Operation ID is required",
    });
  }

  if (!styleNo) {
    return res.status(400).json({
      success: false,
      message: "Style Number is required",
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
    // STEP 1: Validate operation exists
    const operationRecord = await SubOperation.findByPk(parseInt(operation));
    if (!operationRecord) {
      return res.status(404).json({
        success: false,
        message: "Operation not found",
      });
    }

    // STEP 2: Validate style exists
    const styleRecord = await Style.findOne({
      where: {
        style_no: styleNo,
      },
    });

    if (!styleRecord) {
      return res.status(404).json({
        success: false,
        message: "Style not found",
      });
    }

    // STEP 3: Prepare filename
    const timestamp = Date.now();
    const originalExt = path.extname(req.file.originalname);
    const sanitizedName =
      `${operationRecord.sub_operation_name}_${styleNo}_${timestamp}${originalExt}`
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .substring(0, 200); // Limit filename length

    console.log(`📤 Starting jig operation ${mediaType} upload:`, {
      operation: operationRecord.sub_operation_name,
      styleNo: styleNo,
      originalName: req.file.originalname,
      generatedName: sanitizedName,
      size: req.file.size,
      mediaType: mediaType,
    });

    // STEP 4: Upload to B2
    const uploadResult = await b2JigOperationStorage.uploadJigOperationMedia(
      req.file.buffer,
      sanitizedName,
      mediaType,
    );

    // STEP 5: Save to database
    const dbRecord = await JigOperationMedia.create({
      file_name: req.file.originalname,
      media_url: uploadResult.filePath,
      b2_file_id: uploadResult.fileId,
      file_size: req.file.size,
      mime_type: req.file.mimetype.split(";")[0],
      media_type: mediaType,
      description: description.trim() || "",
      operation_id: parseInt(operation),
      style_id: styleRecord.style_id,
      uploaded_by: req.user?.userId,
      is_active: true,
    });

    // STEP 6: Return success response
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
        operation: {
          id: operationRecord.sub_operation_id,
          name: operationRecord.sub_operation_name,
        },
        style: {
          id: styleRecord.style_id,
          no: styleRecord.style_no,
          name: styleRecord.style_name,
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

    // STEP 2: Check if user owns this media
    if (mediaRecord.uploaded_by !== req.user?.userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this media",
      });
    }

    // STEP 3: Delete from B2 storage
    if (mediaRecord.b2_file_id && mediaRecord.media_url) {
      try {
        await b2JigOperationStorage.deleteFile(
          mediaRecord.b2_file_id,
          mediaRecord.media_url,
        );
        console.log(`✅ Deleted from B2: ${mediaRecord.media_url}`);
      } catch (b2Error) {
        console.error(
          "⚠️ B2 deletion failed but continuing with soft delete:",
          b2Error,
        );
        // Continue with soft delete even if B2 deletion fails
      }
    }

    // STEP 4: Soft delete from database
    await mediaRecord.update({
      is_active: false,
      deleted_at: new Date(),
    });

    // STEP 5: Return success
    res.status(200).json({
      success: true,
      message: "Jig operation media deleted successfully",
      data: {
        jig_media_id: parseInt(media_id),
        file_name: mediaRecord.file_name,
        media_type: mediaRecord.media_type,
      },
    });
  } catch (error) {
    console.error("❌ Delete jig operation media error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete media",
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
            "sub_operation_id",
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
exports.getMediaByOperation = async (req, res) => {
  const { operation_id } = req.params;
  const { media_type } = req.query;

  try {
    const whereClause = {
      operation_id: parseInt(operation_id),
      is_active: true,
    };

    if (media_type && ["image", "video"].includes(media_type)) {
      whereClause.media_type = media_type;
    }

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
          model: JigOperation, // Include the Operation model
          as: "operation", // Make sure this matches your association name
          attributes: ["operation_id", "operation_name", "operation_code"], // Add any other fields you need
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // Group media by operation name
    const groupedByOperation = mediaRecords.reduce((acc, record) => {
      const operationName =
        record.operation?.operation_name || "Unnamed Operation";
      const operationId = record.operation?.operation_id || "unknown";

      // Create a unique key combining operation name and ID to handle same names from different operations
      const key = `${operationName}_${operationId}`;

      if (!acc[key]) {
        acc[key] = {
          operation_name: operationName,
          operation_id: operationId,
          operation_code: record.operation?.operation_code || null,
          total_count: 0,
          images: [],
          videos: [],
          all_media: [],
        };
      }

      // Add to all_media
      acc[key].all_media.push(record);
      acc[key].total_count += 1;

      // Separate by media type
      if (record.media_type === "image") {
        acc[key].images.push(record);
      } else if (record.media_type === "video") {
        acc[key].videos.push(record);
      }

      return acc;
    }, {});

    // Convert to array and sort by operation name
    const groupedData = Object.values(groupedByOperation).sort((a, b) =>
      a.operation_name.localeCompare(b.operation_name),
    );

    res.status(200).json({
      success: true,
      data: groupedData,
      total_operations: groupedData.length,
      total_media: mediaRecords.length,
    });
  } catch (error) {
    console.error("❌ Get media by operation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch media",
      error: error.message,
    });
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
            "sub_operation_id",
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
        "sub_operation_id",
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
          operation_ids: [],
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
      acc[operationName].operation_ids.push(opData.sub_operation_id);
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
          operation_id: opData.sub_operation_id,
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
      operation_ids: group.operation_ids,
      operation_numbers: group.operation_numbers,
      operation_count: group.operation_ids.length,
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
  const { operation_id } = req.params;
  const { media_type } = req.query;
  console.log("getting media 📸🎥🎥🎥");
  try {
    // Validate operation exists
    const operation = await SubOperation.findByPk(operation_id, {
      attributes: [
        "sub_operation_id",
        "sub_operation_name",
        "sub_operation_code",
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
      operation_id: parseInt(operation_id),
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
          id: operation.sub_operation_id,
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
  const { operation_id, style_id } = req.params;
  const { media_type } = req.query;
  console.log("getting media 222 📸🎥🎥🎥");
  try {
    const whereClause = {
      operation_id: parseInt(operation_id),
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
        "sub_operation_id",
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
          operation_ids: [],
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
      group.operation_ids.push(opData.sub_operation_id);
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
          operation_id: opData.sub_operation_id,
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
      operation_count: group.operation_ids.length,
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
        "sub_operation_id",
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

    const operationIds = operations.map((op) => op.sub_operation_id);
    const operationInfo = operations.map((op) => ({
      id: op.sub_operation_id,
      number: op.sub_operation_number,
    }));

    // Build where clause for media - use IN clause for multiple operation IDs
    const whereClause = {
      operation_id: operationIds,
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
            "sub_operation_id",
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
        operation_ids: operationIds,
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
  const { operation_id } = req.params;
  const { media_type } = req.query;
  console.log("getting media 📸🎥🎥🎥");

  try {
    // Validate operation exists
    const operation = await SubOperation.findByPk(operation_id, {
      attributes: [
        "sub_operation_id",
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
      operation_id: parseInt(operation_id),
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
          id: operation.sub_operation_id,
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
