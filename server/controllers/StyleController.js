const { Model } = require("sequelize");
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
  NeedleTread,
  NeedleType,
  SubOperationMedia,
} = require("../models");
const ExcelJS = require("exceljs");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
// const { sequelize, Style, StyleMedia } = require("../models");

// Helper function to save image to network location
async function saveImageToNetwork(file, styleNo, imageType, styleId) {
  try {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${styleNo}_${imageType}_${Date.now()}${fileExtension}`;
    const filePath = path.join(NETWORK_PATH, fileName);

    ensureDirectoryExists(filePath);
    fs.writeFileSync(filePath, file.buffer);

    if (fs.existsSync(filePath)) {
      console.log(`File successfully saved to: ${filePath}`);
      const stats = fs.statSync(filePath);
      console.log(`File size: ${stats.size} bytes`);
    } else {
      console.error(`File was not saved successfully`);
      return null;
    }
    console.log("file path========= ", filePath);
    // Return the network path to store in database
    return filePath;
  } catch (error) {
    console.error(
      `Error saving ${imageType} image for style ${styleId}:`,
      error
    );
    return null;
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
    // console.log("styles list:- ", styles);
    // console.log(styles);
    if (styles) {
      res.status(200).json({ status: "success", data: styles });
    }
  } catch (error) {
    return next(error);
  }
};

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
  // console.log("requesting");
  // console.log(req.body);
  const { styleNo, poNo } = req.body;
  try {
    const operations = await Style.findOne({
      where: { style_no: styleNo, po_number: poNo },
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
                { model: NeedleType, as: "needle_types" },
                { model: NeedleTread, as: "needle_treads" },
                { model: NeedleLooper, as: "needle_loopers" },
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

// for add new style
// for add new style

exports.addStyle = async (req, res, next) => {
  if (req?.user?.userRole !== "Admin") {
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

    // Step 2: Process images from multer
    if (req.files) {
      if (req.files["frontImage"]) {
        const file = req.files["frontImage"][0];
        styleMediaRecords.push({
          style_media_id: uuidv4(),
          style_id: style.style_id,
          media_url: `${file.filename}`, // saved filename (styleNo_front.ext)
          media_type: "front",
        });
      }

      if (req.files["backImage"]) {
        const file = req.files["backImage"][0];
        styleMediaRecords.push({
          style_media_id: uuidv4(),
          style_id: style.style_id,
          media_url: file.filename, // saved filename (styleNo_back.ext)
          media_type: "back",
        });
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
exports.editStyle = async (req, res, next) => {
  if (req?.user?.userRole !== "Admin") {
    const error = new Error("You don't have permission to perform this action");
    error.status = 401;
    throw error;
  }

  console.log("edit route called");
  const styleId = req.params.id;
  const {
    styleFactory,
    styleCustomer,
    styleSeason,
    styleNo,
    styleName,
    styleDescription,
  } = req.body;

  try {
    // 1️⃣ Find style
    const currentStyle = await Style.findByPk(styleId);
    if (!currentStyle) {
      const error = new Error("Cannot find that style in database");
      error.status = 404;
      return next(error);
    }

    // 2️⃣ Update style fields
    const editStyle = {
      factory_id: styleFactory,
      customer_id: styleCustomer,
      season_id: styleSeason,
      style_no: styleNo,
      style_name: styleName,
      style_description: styleDescription,
    };
    await currentStyle.update(editStyle);

    // 3️⃣ Handle media files if uploaded
    const files = req.files;
    if (files?.frontImage?.[0]) {
      const frontFile = files.frontImage[0];
      await StyleMedia.upsert({
        style_media_id: `${styleId}-front`, // fixed id format
        style_id: styleId,
        media_url: frontFile.filename, // multer already renamed
        media_type: "front",
      });
    }

    if (files?.backImage?.[0]) {
      const backFile = files.backImage[0];
      await StyleMedia.upsert({
        style_media_id: `${styleId}-back`,
        style_id: styleId,
        media_url: backFile.filename,
        media_type: "back",
      });
    }

    console.log("update success");
    res.status(200).json({ status: "success", message: "Style edit success" });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

// for delete existing style
exports.deleteStyle = async (req, res, next) => {
  if (req?.user?.userRole !== "Admin") {
    const error = new Error("You don't have permission to perform this action");
    error.status = 401;
    return next(error);
  }

  const styleId = req.params.id;

  try {
    const style = await Style.findByPk(styleId);
    if (!style) {
      const error = new Error("Cannot find that record in database");
      error.status = 404;
      return next(error);
    }

    // 1️⃣ fetch all related media
    const mediaRecords = await StyleMedia.findAll({
      where: { style_id: styleId },
    });
    console.log("media records count =========== ", mediaRecords.length);
    const networkPath =
      "\\\\192.168.46.209\\Operation bullatin videos\\StyleImages";

    // 2️⃣ delete files from network share
    for (const media of mediaRecords) {
      const filePath = path.join(networkPath, media.media_url);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Deleted file: ${filePath}`);
        } catch (err) {
          console.error(`Failed to delete file: ${filePath}`, err);
        }
      }
    }

    // 3️⃣ delete media records
    await StyleMedia.destroy({ where: { style_id: styleId } });

    // 4️⃣ delete style record
    await style.destroy();

    res
      .status(200)
      .json({ status: "success", message: "Style deleted successfully" });
  } catch (error) {
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
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=styles.xlsx");

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return next(error);
  }
};
