const {
  Layout,
  Workstation,
  sequelize,
  MainOperation,
  SubOperation,
  Style,
  Machine,
  Customer,
  SubOperationMedia,
  SubOperationImages,
  SubOperationTechPack,
  SubOperationFolder,
} = require("../models");
const { Op, where } = require("sequelize");

exports.getAllStyles = async (req, res, next) => {
  try {
    const styles = await Style.findAll({
      attributes: ["style_no"],
      raw: true,
    });

    return res.status(200).json({
      success: true,
      styles: styles,
    });
  } catch (error) {
    console.error("Error fetching styles:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch styles",
    });
  }
};

exports.getStyles = async (req, res, next) => {
  try {
    const { searchTerm } = req.params;

    let styles = await Style.findAll({
      where:
        searchTerm && searchTerm !== "all"
          ? {
              style_no: {
                [Op.like]: `%${searchTerm}%`,
              },
            }
          : undefined,
      limit: 20, // Add limit for performance
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      styles: styles,
      count: styles.length,
    });
  } catch (err) {
    console.error("Error in getStyles:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.countBase = async (req, res, next) => {
  try {
    const customerCount = await Customer.count();
    const machineCount = await Machine.count();
    const styles = await Style.count();

    res.status(200).json({
      customerCount,
      machineCount,
      styles,
    });
  } catch (error) {
    console.error("Error while counting base items: ", error);
    next(error);
  }
};

exports.countSub = async (req, res, next) => {
  try {
    const mainOp = await MainOperation.count();
    const subOp = await SubOperation.count();
    const videos = await SubOperationMedia.count();
    const images = await SubOperationImages.count();
    const techPacks = await SubOperationTechPack.count();
    const folders = await SubOperationFolder.count();

    res.status(200).json({ mainOp, subOp, videos, images, techPacks, folders });
  } catch (error) {
    console.error("Error while counting base items: ", error);
    next(error);
  }
};

exports.countFilterSub = async (req, res, next) => {
  const { selectedStyle } = req.params;

  try {
    // 1️⃣ Find the style
    const style = await Style.findOne({ where: { style_no: selectedStyle } });
    if (!style) {
      const error = new Error("Can't find that style in database");
      error.status = 404;
      throw error;
    }

    // 2️⃣ Get all main operations for that style
    const mainOperations = await MainOperation.findAll({
      where: { style_no: style.style_id }, // style_no is the FK in MainOperation
      attributes: ["operation_id"],
      raw: true,
    });

    const mainOpIds = mainOperations.map((op) => op.operation_id);

    // 3️⃣ Get all sub-operations for those main operations
    const subOperations = await SubOperation.findAll({
      where: { main_operation_id: mainOpIds },
      attributes: ["sub_operation_id"],
      raw: true,
    });

    const subOpIds = subOperations.map((sub) => sub.sub_operation_id);
    const subOpCount = subOpIds.length;

    // 4️⃣ Count related items
    const videos = await SubOperationMedia.count({
      where: { sub_operation_id: subOpIds },
    });

    const images = await SubOperationImages.count({
      where: { sub_operation_id: subOpIds },
    });

    const techPacks = await SubOperationTechPack.count({
      where: { sub_operation_id: subOpIds },
    });

    const folders = await SubOperationFolder.count({
      where: { sub_operation_id: subOpIds },
    });

    // 5️⃣ Send response
    res.status(200).json({
      mainOp: mainOpIds.length,
      subOp: subOpCount,
      videos,
      images,
      techPacks,
      folders,
    });
  } catch (error) {
    console.error("Error while counting sub items:", error);
    next(error);
  }
};
