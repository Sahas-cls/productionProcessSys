const { Model } = require("sequelize");
const {
  Style,
  Customer,
  Factory,
  Season,
  MainOperation,
  SubOperation,
  Machine,
  NeedleLooper,
  NeedleTread,
  NeedleType,
} = require("../models");
const ExcelJS = require("exceljs");

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
    throw error;
  }

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

    const result = await Style.create(newStyle);

    // Save images to network location and database
    const styleMediaRecords = [];

    // Process front image
    if (req.files && req.files["frontImage"]) {
      const frontImage = req.files["frontImage"][0];
      const frontMediaUrl = await saveImageToNetwork(
        frontImage,
        styleNo,
        "front",
        result.style_id
      );

      if (frontMediaUrl) {
        styleMediaRecords.push({
          style_media_id: uuidv4(),
          style_id: result.style_id,
          media_url: frontMediaUrl,
          media_type: "front",
        });
      }
    }

    // Process back image
    if (req.files && req.files["backImage"]) {
      const backImage = req.files["backImage"][0];
      const backMediaUrl = await saveImageToNetwork(
        backImage,
        styleNo,
        "back",
        result.style_id
      );

      if (backMediaUrl) {
        styleMediaRecords.push({
          style_media_id: uuidv4(),
          style_id: result.style_id,
          media_url: backMediaUrl,
          media_type: "back",
        });
      }
    }

    // Save media records to database
    if (styleMediaRecords.length > 0) {
      await StyleMedia.bulkCreate(styleMediaRecords);
    }

    res.status(201).json({
      status: "success",
      message: "Style creation success",
      styleId: result.style_id,
    });
  } catch (error) {
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
  console.log(req.body);
  console.log("req.params ", req.params);
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
    const currentStyle = await Style.findByPk(styleId);
    if (!currentStyle) {
      console.log("cannot find record to update");
      const error = new Error("Cannot find that style in database");
      error.status = 401;
      return next(error);
    }

    const editStyle = {
      factory_id: styleFactory,
      customer_id: styleCustomer,
      season_id: styleSeason,
      style_no: styleNo,
      style_name: styleName,
      style_description: styleDescription,
    };

    console.log("edit style === ", editStyle);

    await currentStyle.update(editStyle);
    console.log("update success");

    res.status(200).json({ status: "success", message: "Style edit success" });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

// for delete existing style
exports.deleteStyle = async (req, res, next) => {
  // console.log(req.body);
  // console.log(req.params.id);
  if (req?.user?.userRole !== "Admin") {
    const error = new Error("You don't have permission to perform this action");
    error.status = 401;
    throw error;
  }
  const styleId = req.params.id;
  try {
    const style = await Style.findByPk(styleId);

    if (!style) {
      const error = new Error("Cannot find that record on database");
      error.status = 401;
      return next(error);
    }

    await style.destroy();
    res
      .status(200)
      .json({ status: "success", message: "Style delete success" });
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
