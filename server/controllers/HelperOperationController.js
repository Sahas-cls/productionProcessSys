const { Style, Helper } = require("../models");

exports.getHelperOperations = async (req, res, next) => {
  console.log("getting helper operations");
  const { styleId } = req.params;

  try {
    if (!styleId) {
      const error = new Error(
        "Style cannot be found because you haven't provided any style id please check your request",
      );
      error.status = 400;
      throw error;
    }
    const style = await Style.findOne({ where: { style_no: styleId } });
    if (!style.style_id) {
      const error = new Error(
        `Provided style number ${styleId} cannot find in database please try again`,
      );
      error.status = 400;
      throw error;
    }
    const styleOperations = await Helper.findAll({
      where: { style_id: style.style_id },
    });
    console.log(`found ${styleOperations.length || 0} operations ✅`);
    return res.status(200).json({ status: "Ok", data: styleOperations });
  } catch (error) {
    return res
      .status(error.status || 500)
      .json({ status: "error", error: error });
  }
};
