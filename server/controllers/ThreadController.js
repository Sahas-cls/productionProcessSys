const { Thread } = require("../models");

exports.createThread = async (req, res, next) => {
  console.log(req.body);
  const { threadCategory, description, isActive } = req.body;
  try {
    const isThread = await Thread.findOne({
      where: { thread_id: threadCategory },
    });

    if (!threadCategory) {
      const error = new Error("Thread category required");
      error.status = 400;
      error.field = "threadCategory";
      throw error;
    }

    if (isThread) {
      const error = new Error("Provided thead category is already in database");
      error.status = 400;
      throw error;
    }

    await Thread.create({
      thread_category: threadCategory,
      description: description,
      status: isActive,
    });

    console.log("threat created");
    return res
      .status(201)
      .json({ status: "Ok", message: "Thread type creation success" });
  } catch (error) {
    return next(error);
  }
};

exports.editThread = async (req, res, next) => {
  const { thread_id } = req.params;
  const { threadCategory, description, isActive } = req.body;
  console.log("req body: ", req.body);
  try {
    const isExits = await Thread.findByPk(thread_id);

    if (!isExits) {
      const error = new Error(
        "Cannot found thread in database it may already deleted"
      );
      error.status = 400;
      throw error;
    }
    await isExits.update({
      thread_category: threadCategory,
      description: description,
      status: isActive,
    });

    return res
      .status(200)
      .json({ status: "Ok", message: "Thread update success" });
  } catch (error) {
    console.log("Error");
    return next(error);
  }
  console.log("threat editing", thread_id);
};

exports.deleteThread = async (req, res, next) => {
  console.log("deleting threats");
  const { thread_id } = req.params;
  try {
    const isDelete = await Thread.findByPk(thread_id);

    if (!isDelete) {
      const error = new Error(
        "Cannot find that thread type in database may be it's already deleted"
      );
      error.status = 400;
      throw error;
    }

    await isDelete.destroy();
    return res
      .status(200)
      .json({ status: "Ok", message: "Thread delete successful" });
  } catch (error) {
    return next(error);
  }
};

exports.getTread = async (req, res, next) => {
  console.log("sending threads ============== ");
  try {
    const treads = await Thread.findAll({
      order: [["createdAt", "DESC"]],
    });
    console.log("threads: ", treads);
    return res.status(200).json({ status: "Ok", data: treads });
  } catch (error) {
    return next(error);
  }
};
