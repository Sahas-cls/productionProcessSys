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
const localStorage = require("../utils/FileStorageService");

// Helper function to generate filename
function generateFileName(styleNo, type) {
  if (styleNo && type) {
    // Remove any special characters from styleNo to avoid filesystem issues
    const sanitizedStyleNo = styleNo.replace(/[^a-zA-Z0-9-_]/g, "_");
    const name = `${sanitizedStyleNo}_${type}_${Date.now()}`;
    return name;
  }
  return null;
}

// Get all styles
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

    // Add local URLs to the response
    const stylesWithUrls = styles.map((style) => {
      const styleData = style.toJSON();

      if (styleData.style_medias && styleData.style_medias.length > 0) {
        styleData.style_medias = styleData.style_medias.map((media) => {
          return {
            ...media,
            // Add URL for frontend to access images
            media_url_full: `/style-images/${path.basename(media.media_url)}`,
          };
        });
      }

      return styleData;
    });

    if (styles) {
      res.status(200).json({ status: "success", data: stylesWithUrls });
    }
  } catch (error) {
    return next(error);
  }
};

// Get unique styles (without media)
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

    if (styles) {
      res.status(200).json({ status: "success", data: styles });
    }
  } catch (error) {
    return next(error);
  }
};

// Get PO list by style ID
exports.getPOList = async (req, res, next) => {
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

// Get styles with operations
exports.getStylesMo = async (req, res, next) => {
  console.log("requesting");
  console.log(req.body);
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

// Add new style
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

    // Validate style number
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

    // Create style
    const style = await Style.create(newStyle, { transaction: t });

    const styleMediaRecords = [];

    // Process images from multer and save to local storage
    if (req.files) {
      // Process front image
      if (req.files["frontImage"]) {
        const file = req.files["frontImage"][0];
        const fileName =
          generateFileName(styleNo, "front") + path.extname(file.originalname);

        const uploadResult = await localStorage.uploadStyImage(
          file.buffer,
          fileName,
        );

        console.log("upload result for inspect 👀👀", uploadResult);
        if (uploadResult) {
          styleMediaRecords.push({
            style_media_id: uuidv4(),
            style_id: style.style_id,
            media_url: `StyleImages/${fileName}`,
            media_type: "front",
          });
        }
      }

      // Process back image
      if (req.files["backImage"]) {
        const file = req.files["backImage"][0];
        const fileName =
          generateFileName(styleNo, "back") + path.extname(file.originalname);

        const uploadResult = await localStorage.uploadStyImage(
          file.buffer,
          fileName,
        );

        console.log("upload result for inspect 👀👀", uploadResult);
        if (uploadResult) {
          styleMediaRecords.push({
            style_media_id: uuidv4(),
            style_id: style.style_id,
            media_url: `StyleImages/${fileName}`,
            media_type: "back",
          });
        }
      }
    }

    // Save media records
    if (styleMediaRecords.length > 0) {
      await StyleMedia.bulkCreate(styleMediaRecords, { transaction: t });
    }

    // Commit transaction
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

// Edit existing style
exports.editStyle = async (req, res, next) => {
  if (req?.user?.userRole !== "Admin" && req?.user?.userRole !== "SuperAdmin") {
    const error = new Error("You don't have permission to perform this action");
    error.status = 403;
    return next(error);
  }

  console.log("edit route called");
  console.log("📦 Request body:", req.body);
  console.log("📦 Request files:", req.files);

  const styleId = req.params.id;
  const {
    styleFactory,
    styleCustomer,
    styleSeason,
    styleNo,
    poNumber,
    styleName,
    styleDescription,
    existingImages,
  } = req.body;

  const t = await sequelize.transaction();

  try {
    // Validate style number - exclude current style from check
    const findStyleNo = await Style.findAll({
      where: {
        style_no: styleNo,
        po_number: poNumber,
        style_id: { [Op.ne]: styleId },
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

    // Track newly uploaded files to prevent them from being deleted
    const newlyUploadedUrls = [];

    // Process new uploaded files FIRST
    if (req.files && Object.keys(req.files).length > 0) {
      console.log("🖼️ Processing uploaded files:", Object.keys(req.files));

      // Process front image
      if (req.files["frontImage"]) {
        const frontFile = Array.isArray(req.files["frontImage"])
          ? req.files["frontImage"][0]
          : req.files["frontImage"];

        console.log("Processing front image:", frontFile.originalname);

        // Check if old media exists
        const existingMedia = await StyleMedia.findOne({
          where: {
            style_id: styleId,
            media_type: "front",
          },
          transaction: t,
        });

        // Delete old file if exists (but don't delete if it's the same as newly uploaded)
        if (existingMedia) {
          try {
            await localStorage.deleteFile(null, existingMedia.media_url);
            console.log(
              `✅ Deleted old front image: ${existingMedia.media_url}`,
            );
          } catch (deleteError) {
            console.warn(
              `Could not delete old front image:`,
              deleteError.message,
            );
          }
        }

        // Upload new file
        const fileName =
          generateFileName(styleNo, "front") +
          path.extname(frontFile.originalname);
        console.log("📤 Uploading new front image:", fileName);

        const uploadResult = await localStorage.uploadStyImage(
          frontFile.buffer,
          fileName,
        );

        if (uploadResult) {
          const mediaUrl = `StyleImages/${fileName}`;
          newlyUploadedUrls.push(mediaUrl); // Track this URL

          if (existingMedia) {
            // Update existing record
            await existingMedia.update(
              {
                media_url: mediaUrl,
              },
              { transaction: t },
            );
            console.log("✅ Updated front media record");
          } else {
            // Create new record
            await StyleMedia.create(
              {
                style_media_id: uuidv4(),
                style_id: styleId,
                media_url: mediaUrl,
                media_type: "front",
              },
              { transaction: t },
            );
            console.log("✅ Created new front media record");
          }
        }
      }

      // Process back image
      if (req.files["backImage"]) {
        const backFile = Array.isArray(req.files["backImage"])
          ? req.files["backImage"][0]
          : req.files["backImage"];

        console.log("Processing back image:", backFile.originalname);

        // Check if old media exists
        const existingMedia = await StyleMedia.findOne({
          where: {
            style_id: styleId,
            media_type: "back",
          },
          transaction: t,
        });

        // Delete old file if exists
        if (existingMedia) {
          try {
            await localStorage.deleteFile(null, existingMedia.media_url);
            console.log(
              `✅ Deleted old back image: ${existingMedia.media_url}`,
            );
          } catch (deleteError) {
            console.warn(
              `Could not delete old back image:`,
              deleteError.message,
            );
          }
        }

        // Upload new file
        const fileName =
          generateFileName(styleNo, "back") +
          path.extname(backFile.originalname);
        console.log("📤 Uploading new back image:", fileName);

        const uploadResult = await localStorage.uploadStyImage(
          backFile.buffer,
          fileName,
        );

        if (uploadResult) {
          const mediaUrl = `StyleImages/${fileName}`;
          newlyUploadedUrls.push(mediaUrl); // Track this URL

          if (existingMedia) {
            // Update existing record
            await existingMedia.update(
              {
                media_url: mediaUrl,
              },
              { transaction: t },
            );
            console.log("✅ Updated back media record");
          } else {
            // Create new record
            await StyleMedia.create(
              {
                style_media_id: uuidv4(),
                style_id: styleId,
                media_url: mediaUrl,
                media_type: "back",
              },
              { transaction: t },
            );
            console.log("✅ Created new back media record");
          }
        }
      }
    } else {
      console.log("📭 No files uploaded in this request");
    }

    // Handle existing images that might have been removed
    if (existingImages) {
      console.log("🖼️ Processing existing images:", existingImages);

      let parsedExistingImages;
      try {
        parsedExistingImages =
          typeof existingImages === "string"
            ? JSON.parse(existingImages)
            : existingImages;
      } catch (e) {
        console.error("Error parsing existingImages:", e);
        parsedExistingImages = [];
      }

      // Find all current media for this style
      const currentMedia = await StyleMedia.findAll({
        where: { style_id: styleId },
        transaction: t,
      });

      console.log(
        "Current media in DB:",
        currentMedia.map((m) => ({ url: m.media_url, type: m.media_type })),
      );
      console.log("Newly uploaded URLs:", newlyUploadedUrls);

      // Delete media that are not in existingImages AND not newly uploaded
      for (const media of currentMedia) {
        const stillExists = parsedExistingImages.some(
          (img) =>
            img.path === media.media_url && img.type === media.media_type,
        );

        // Check if this media is newly uploaded (should NOT be deleted)
        const isNewlyUploaded = newlyUploadedUrls.includes(media.media_url);

        if (!stillExists && !isNewlyUploaded) {
          console.log(
            `🗑️ Removing media that no longer exists: ${media.media_url}`,
          );

          // Delete file from local storage
          try {
            await localStorage.deleteFile(null, media.media_url);
            console.log(`✅ Deleted file: ${media.media_url}`);
          } catch (deleteError) {
            console.warn(
              `Could not delete file: ${media.media_url}`,
              deleteError.message,
            );
          }

          // Delete database record
          await media.destroy({ transaction: t });
          console.log(`✅ Deleted media record for: ${media.media_type}`);
        } else {
          console.log(
            `✅ Keeping media: ${media.media_url} (stillExists: ${stillExists}, isNewlyUploaded: ${isNewlyUploaded})`,
          );
        }
      }
    }

    // Commit transaction
    await t.commit();
    console.log("✅ Update successful - transaction committed");

    res.status(200).json({
      status: "success",
      message: "Style updated successfully",
      styleId: styleId,
    });
  } catch (error) {
    await t.rollback();
    console.error("❌ Edit style error:", error);
    return next(error);
  }
};

// Delete existing style
exports.deleteStyle = async (req, res, next) => {
  if (req?.user?.userRole !== "Admin" && req?.user?.userRole !== "SuperAdmin") {
    const error = new Error("You don't have permission to perform this action");
    error.status = 401;
    return next(error);
  }

  const styleId = req.params.id;
  const t = await sequelize.transaction();

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

    // Delete files from local storage
    if (style.style_medias && style.style_medias.length > 0) {
      for (const media of style.style_medias) {
        try {
          await localStorage.deleteFile(null, media.media_url);
          console.log(`✅ Deleted: ${media.media_url}`);
        } catch (deleteError) {
          console.warn(
            `⚠️ Could not delete file ${media.media_url}:`,
            deleteError.message,
          );
        }
      }
    }

    // Delete media records from database
    await StyleMedia.destroy({
      where: { style_id: styleId },
      transaction: t,
    });

    // Delete style record
    await style.destroy({ transaction: t });

    // Commit transaction
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

// Generate Excel file using style details
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
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "4472C4" },
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
