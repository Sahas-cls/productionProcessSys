const { Model, Op } = require("sequelize");
const {
  sequelize,
  Style,
  StyleMedia,
  Customer,
  Factory,
  Season,
  MainOperation,
  SubOperation,
  Machine,
  NeedleLooper,
  Thread,
  NeedleTypeN,
  SubOperationMedia,
} = require("../models");
const ExcelJS = require("exceljs");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const b2Storage = require("../utils/b2Storage");

// Import B2 Storage helper
// const b2Storage = require("../utils/b2Storage");

// Helper function to save image to Backblaze B2
// Helper function (should be in same file or imported)
async function saveImageToB2(file, styleNo, imageType, styleId) {
  try {
    const fileExtension = path.extname(file.originalname);

    // Generate unique filename
    const fileName = `${styleNo}_${imageType}_${Date.now()}${fileExtension}`;

    // Upload to B2
    const uploadResult = await b2Storage.uploadFile(
      file.buffer,
      fileName,
      `styles/${styleId}`, // Optional: keep folder structure
    );

    if (uploadResult) {
      console.log(`${imageType} image uploaded: ${uploadResult.filePath}`);
      return {
        filePath: uploadResult.filePath,
        fileId: uploadResult.fileId,
        fileName: fileName,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error saving ${imageType} image:`, error);
    throw error; // Let the transaction handle rollback
  }
}

// Helper function to delete files from B2
async function deleteFileFromB2(mediaRecord) {
  try {
    // If we have fileId, use it (most reliable)
    if (mediaRecord.b2_file_id) {
      console.log(`Deleting B2 file with ID: ${mediaRecord.b2_file_id}`);
      return await b2Storage.deleteFile(
        mediaRecord.b2_file_id,
        mediaRecord.media_url,
      );
    }
    // Otherwise try to delete by path
    else {
      console.log(`Deleting B2 file by path: ${mediaRecord.media_url}`);
      return await b2Storage.deleteFileByPath(mediaRecord.media_url);
    }
  } catch (error) {
    console.error(
      `Failed to delete B2 file ${mediaRecord.media_url}:`,
      error.message,
    );

    // Don't throw error for "file not found" - it might already be deleted
    if (error.code === "NoSuchKey" || error.code === "NotFound") {
      console.log(
        `File ${mediaRecord.media_url} not found (may already be deleted)`,
      );
      return { success: true, message: "File not found (already deleted)" };
    }

    throw error; // Re-throw other errors
  }
}

// for get all styles
exports.getStyles = async (req, res, next) => {
  console.log("get style called");
  try {
    const styles = await Style.findAll({
      include: [
        {
          model: StyleMedia,
          as: "style_medias",
        },
        {
          model: Customer,
          as: "customer",
          required: true,
        },
        {
          model: Factory,
          as: "factory",
          required: true,
        },
        {
          model: Season,
          as: "season",
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // If you want to add full URLs to the response
    const stylesWithUrls = await Promise.all(
      styles.map(async (style) => {
        const styleData = style.toJSON();

        if (styleData.style_medias && styleData.style_medias.length > 0) {
          // Add full URLs to each media item
          styleData.style_medias = await Promise.all(
            styleData.style_medias.map(async (media) => {
              try {
                // Generate signed URL for B2 file
                const signedUrl = await b2Storage.getSignedUrl(media.media_url);
                return {
                  ...media,
                  media_url_full: signedUrl.downloadUrl,
                  media_url_signed: signedUrl.signedUrl,
                };
              } catch (error) {
                console.error(
                  `Error generating URL for media ${media.media_url}:`,
                  error,
                );
                // Return the media without URLs if there's an error
                return {
                  ...media,
                  media_url_full: null,
                  media_url_signed: null,
                  error: "Failed to generate URL",
                };
              }
            }),
          );
        }

        return styleData;
      }),
    );

    if (styles) {
      res.status(200).json({ status: "success", data: stylesWithUrls });
    }
  } catch (error) {
    return next(error);
  }
};

// ... (keep other get functions as they are - getStylesUnique, getPOList, getStylesMo) ...
exports.getStylesUnique = async (req, res, next) => {
  console.log("get style called");
  try {
    const styles = await Style.findAll({
      include: [
        {
          model: Customer,
          as: "customer",
          required: true,
        },
        {
          model: Factory,
          as: "factory",
          required: true,
        },
        {
          model: Season,
          as: "season",
        },
      ],
      distinct: true,
    });
    console.log("styes from backend ============= ", styles);
    // console.log("styles list:- ", styles);
    // console.log(styles);
    if (styles) {
      res.status(200).json({ status: "success", data: styles });
    }
  } catch (error) {
    return next(error);
  }
};

exports.getPOList = async (req, res, next) => {
  //
  console.log(req.params);
  try {
    const poList = await Style.findAll({
      where: { style_no: req.params.styleId },
      attributes: ["po_number"],
    });

    res.status(200).json({ status: "success", data: poList });
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

exports.getStylesMo = async (req, res, next) => {
  //
  console.log("requesting");
  console.log(req.body);
  // return;
  // return res.status(200);
  const { styleNo } = req.body;
  try {
    const operations = await Style.findOne({
      where: { style_no: styleNo },
      include: [
        {
          model: MainOperation,
          as: "operations",
          include: [
            {
              model: SubOperation,
              as: "subOperations",
              include: [
                { model: Machine, as: "machines" },
                { model: NeedleTypeN, as: "needle_type" },
                { model: Thread, as: "thread" },
                { model: Thread, as: "looper" },
                { model: SubOperationMedia, as: "medias" },
              ],
            },
          ],
        },
      ],
    });

    res.status(200).json({ status: "", data: operations });
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

// function generateFileName (styleNo, type){
//   const name =
// }

// for add new style
exports.addStyle = async (req, res, next) => {
  if (req?.user?.userRole !== "Admin" && req?.user?.userRole !== "SuperAdmin") {
    const error = new Error("You don't have permission to perform this action");
    error.status = 401;
    return next(error);
  }

  const t = await sequelize.transaction();

  try {
    const {
      styleFactory,
      styleCustomer,
      styleSeason,
      styleNo,
      styleName,
      styleDescription,
      userId,
      poNumber,
    } = req.body;

    // validate style number
    const findStyleNo = await Style.findAll({
      where: { style_no: styleNo, po_number: poNumber },
      transaction: t,
    });

    if (findStyleNo.length > 0) {
      const error = new Error(
        "The provided style number and po number already exist, please check your data",
      );
      error.status = 400;
      throw error;
    }

    const newStyle = {
      factory_id: styleFactory,
      customer_id: styleCustomer,
      season_id: styleSeason,
      style_no: styleNo,
      po_number: poNumber,
      style_name: styleName,
      style_description: styleDescription,
      created_by: userId,
    };

    // Step 1: Create style
    const style = await Style.create(newStyle, { transaction: t });

    const styleMediaRecords = [];

    // Step 2: Process images from multer and upload to B2
    // In your addStyle function, update the file handling section:
    if (req.files) {
      if (req.files["frontImage"]) {
        const file = req.files["frontImage"][0];

        // Upload to B2 - now returns object with filePath AND fileId
        const uploadResult = await saveImageToB2(
          file,
          styleNo,
          "front",
          style.style_id,
        );

        if (uploadResult) {
          styleMediaRecords.push({
            style_media_id: uuidv4(),
            style_id: style.style_id,
            media_url: uploadResult.filePath, // B2 file path
            media_type: "front",
            b2_file_id: uploadResult.fileId, // Store the fileId from B2
          });
        }
      }

      if (req.files["backImage"]) {
        const file = req.files["backImage"][0];

        //TODO Upload to B2 - now returns object with filePath AND fileId
        const uploadResult = await saveImageToB2(
          file,
          styleNo,
          "back",
          style.style_id,
        );

        if (uploadResult) {
          styleMediaRecords.push({
            style_media_id: uuidv4(),
            style_id: style.style_id,
            media_url: uploadResult.filePath, // B2 file path
            media_type: "back",
            b2_file_id: uploadResult.fileId, // Store the fileId from B2
          });
        }
      }
    }

    // Step 3: Save media records
    if (styleMediaRecords.length > 0) {
      await StyleMedia.bulkCreate(styleMediaRecords, { transaction: t });
    }

    // Step 4: Commit transaction
    await t.commit();

    res.status(201).json({
      status: "success",
      message: "Style created successfully",
      styleId: style.style_id,
    });
  } catch (error) {
    await t.rollback();
    return next(error);
  }
};

// for edit existing style
// const b2Storage = require("../utils/b2Storage"); // Add this import

exports.editStyle = async (req, res, next) => {
  if (req?.user?.userRole !== "Admin" && req?.user?.userRole !== "SuperAdmin") {
    const error = new Error("You don't have permission to perform this action");
    error.status = 403; // Forbidden
    return next(error);
  }

  console.log("edit route called");
  const styleId = req.params.id;
  const {
    styleFactory,
    styleCustomer,
    styleSeason,
    styleNo,
    poNumber,
    styleName,
    styleDescription,
  } = req.body;

  const t = await sequelize.transaction(); // Add transaction for safety

  try {
    // Validate style number - exclude current style from check
    const findStyleNo = await Style.findAll({
      where: {
        style_no: styleNo,
        po_number: poNumber,
        style_id: { [Op.ne]: styleId }, // Exclude current style
      },
      transaction: t,
    });

    if (findStyleNo.length > 0) {
      const error = new Error(
        "The provided style number and po number already exist, please check your data",
      );
      error.status = 400;
      throw error;
    }

    // Find style
    const currentStyle = await Style.findByPk(styleId, { transaction: t });
    if (!currentStyle) {
      await t.rollback();
      const error = new Error("Cannot find that style in database");
      error.status = 404;
      return next(error);
    }

    // Update style fields
    const editStyle = {
      factory_id: styleFactory,
      customer_id: styleCustomer,
      season_id: styleSeason,
      style_no: styleNo,
      style_name: styleName,
      po_number: poNumber,
      style_description: styleDescription,
    };
    await currentStyle.update(editStyle, { transaction: t });

    // Handle media files if uploaded
    const files = req.files;

    // Helper function to handle image update
    const handleImageUpdate = async (file, imageType) => {
      // First, check if old media exists
      const existingMedia = await StyleMedia.findOne({
        where: {
          style_id: styleId,
          media_type: imageType,
        },
        transaction: t,
      });

      // Delete old file from B2 if exists
      if (existingMedia && existingMedia.b2_file_id) {
        try {
          await b2Storage.deleteFile(
            existingMedia.b2_file_id,
            existingMedia.media_url,
          );
          console.log(`Deleted old ${imageType} image from B2`);
        } catch (deleteError) {
          console.warn(
            `Could not delete old ${imageType} image:`,
            deleteError.message,
          );
          // Continue anyway - don't fail the whole update
        }
      }

      // Upload new file to B2
      const uploadResult = await saveImageToB2(
        file,
        styleNo,
        imageType,
        styleId,
      );

      if (uploadResult) {
        await StyleMedia.upsert(
          {
            style_media_id: `${styleId}-${imageType}`,
            style_id: styleId,
            media_url: uploadResult.filePath,
            b2_file_id: uploadResult.fileId,
            media_type: imageType,
          },
          { transaction: t },
        );

        return true;
      }

      return false;
    };

    // Process front image
    if (files?.frontImage?.[0]) {
      const frontFile = files.frontImage[0];
      await handleImageUpdate(frontFile, "front");
    }

    // Process back image
    if (files?.backImage?.[0]) {
      const backFile = files.backImage[0];
      await handleImageUpdate(backFile, "back");
    }

    // Commit transaction
    await t.commit();

    console.log("update success");
    res.status(200).json({
      status: "success",
      message: "Style updated successfully",
      styleId: styleId,
    });
  } catch (error) {
    await t.rollback();
    console.error("Edit style error:", error);
    return next(error);
  }
};

// for delete existing style
exports.deleteStyle = async (req, res, next) => {
  if (req?.user?.userRole !== "Admin" && req?.user?.userRole !== "SuperAdmin") {
    const error = new Error("You don't have permission to perform this action");
    error.status = 401;
    return next(error);
  }

  const styleId = req.params.id;
  const t = await sequelize.transaction(); // Add transaction

  try {
    // Find style with its media
    const style = await Style.findByPk(styleId, {
      include: [
        {
          model: StyleMedia,
          as: "style_medias",
        },
      ],
      transaction: t,
    });

    if (!style) {
      await t.rollback();
      const error = new Error("Cannot find that record in database");
      error.status = 404;
      return next(error);
    }

    console.log(
      `Deleting style ${styleId} with ${
        style.style_medias?.length || 0
      } media files`,
    );

    // 1️⃣ Delete files from B2 storage (if any)
    if (style.style_medias && style.style_medias.length > 0) {
      for (const media of style.style_medias) {
        try {
          // Use b2_file_id if available (more reliable)
          if (media.b2_file_id) {
            console.log(`Deleting B2 file with ID: ${media.b2_file_id}`);
            await b2Storage.deleteFile(media.b2_file_id, media.media_url);
          } else {
            // Fallback: try to delete by file path
            console.log(`Deleting B2 file by path: ${media.media_url}`);
            await b2Storage.deleteFileByPath(media.media_url);
          }
          console.log(`✅ Deleted: ${media.media_url}`);
        } catch (deleteError) {
          console.warn(
            `⚠️ Could not delete file ${media.media_url}:`,
            deleteError.message,
          );
          // Continue deleting other files - don't fail entire operation
          // File might already be deleted or not exist
        }
      }
    }

    // 2️⃣ Delete media records from database
    await StyleMedia.destroy({
      where: { style_id: styleId },
      transaction: t,
    });

    // 3️⃣ Delete style record
    await style.destroy({ transaction: t });

    // 4️⃣ Commit transaction
    await t.commit();

    res.status(200).json({
      status: "success",
      message: "Style deleted successfully",
      deletedStyleId: styleId,
    });
  } catch (error) {
    await t.rollback();
    console.error("Delete style error:", error);
    return next(error);
  }
};

// to generate excel file using style details
exports.generateExcel = async (req, res, next) => {
  try {
    const styles = await Style.findAll({
      attributes: { exclude: ["created_by"] },
    });

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Style_details");

    // Define header row
    worksheet.columns = [
      { header: "Style ID", key: "style_id", width: 10 },
      { header: "Factory ID", key: "factory_id", width: 10 },
      { header: "Customer ID", key: "customer_id", width: 12 },
      { header: "Season ID", key: "season_id", width: 10 },
      { header: "PO Number", key: "po_number", width: 15 },
      { header: "Style No", key: "style_no", width: 15 },
      { header: "Style Name", key: "style_name", width: 20 },
      { header: "Description", key: "style_description", width: 30 },
      { header: "Created At", key: "createdAt", width: 20 },
      { header: "Updated At", key: "updatedAt", width: 20 },
    ];

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; // white bold text
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "4472C4" }, // nice blue background
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Add rows from styles
    styles.forEach((style) => {
      worksheet.addRow(style.dataValues);
    });

    // Set response headers for download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", "attachment; filename=styles.xlsx");

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return next(error);
  }
};
