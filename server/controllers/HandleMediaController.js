const {
  Machine,
  SubOperation,
  Style,
  NeedleType,
  MainOperation,
  NeedleTread,
  NeedleLooper,
  SubOperationMachine,
} = require("../models");
// to get all data for upload media screen
exports.getMachineDetails = async (req, res, next) => {
  //
  console.log(req.params);
  const { subOpId } = req.params;

  try {
    const subOP = await SubOperation.findByPk(subOpId, {
      include: [
        { model: NeedleType, as: "needle_types" },
        { model: NeedleTread, as: "needle_treads" },
        { model: NeedleLooper, as: "needle_loopers" },
        {
          model: MainOperation,
          as: "mainOperation",
          include: [{ model: Style, as: "style" }],
        },
        { model: Machine, as: "machines" },
      ],
    });

    // console.log(subOP);
    res.status(200).json({ status: "success", data: subOP });
  } catch (error) {
    return next(error);
  }
};
