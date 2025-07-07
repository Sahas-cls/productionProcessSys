const { Model } = require("sequelize");
const { Style, Customer, Factory, Season } = require("../models");

// for get all styles
exports.getStyles = async (req, res, next) => {
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
    if (styles) {
      res.status(200).json({ status: "success", data: styles });
    }
  } catch (error) {
    return next(error);
  }
};

// for add new style
exports.addStyle = async (req, res, next) => {
  console.log(req.body);
  const {
    styleFactory,
    styleCustomer,
    styleSeason,
    styleNo,
    styleName,
    styleDescription,
    userId,
  } = req.body;

  try {
    const newStyle = {
      factory_id: styleFactory,
      customer_id: styleCustomer,
      season_id: styleSeason,
      style_no: styleNo,
      style_name: styleName,
      style_description: styleDescription,
      created_by: userId,
    };

    const result = await Style.create(newStyle);

    res
      .status(201)
      .json({ status: "success", message: "Style creation success" });
  } catch (error) {
    return next(error);
  }
};

// for edit existing style
exports.editStyle = async (req, res, next) => {
  console.log("edit route called");
  console.log(req.body);
  const {
    styleId,
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
  console.log(req.body);
  console.log(req.params.id);
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
