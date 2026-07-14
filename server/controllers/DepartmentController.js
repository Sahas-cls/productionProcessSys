const db = require("../models");
const Department = db.Department;
const Factory = db.Factory;
const { sequelize } = require("sequelize");

exports.getDepartments = async (req, res, next) => {
  try {
    // Get factory_id from URL params instead of query
    const factoryId = parseInt(req.params.factory_id);

    // Validate factoryId
    if (isNaN(factoryId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid factory ID",
      });
    }

    const departments = await Department.findAll({
      where: { factory_id: factoryId },
      orderBy: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      status: "success",
      data: departments,
    });
  } catch (error) {
    next(error);
  }
};

exports.createDepartment = async (req, res, next) => {
  try {
    const { department_name, factory_id } = req.body;

    // Validate required fields
    if (!department_name || !factory_id) {
      return res.status(400).json({
        status: "error",
        message: "department_name and factory_id are required",
      });
    }

    // Check if factory exists
    const factory = await Factory.findByPk(factory_id);
    if (!factory) {
      return res.status(404).json({
        status: "error",
        message: "Factory not found",
      });
    }

    // Check if department already exists in this factory
    const existingDepartment = await Department.findOne({
      where: {
        department_name: department_name,
        factory_id: factory_id,
      },
    });

    if (existingDepartment) {
      return res.status(409).json({
        status: "error",
        message: "Department already exists in this factory",
      });
    }

    const department = await Department.create({
      department_name,
      factory_id,
    });

    res.status(201).json({
      status: "success",
      message: "Department created successfully",
      data: department,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllDepartments = async (req, res, next) => {
  try {
    const departments = await Department.findAll({
      include: [
        {
          model: db.Factory,
          as: "factory",
          attributes: ["factory_id", "factory_name"], // Adjust attributes as needed
        },
      ],
    });

    res.status(200).json({
      status: "success",
      count: departments.length,
      data: departments,
    });
  } catch (error) {
    next(error);
  }
};

exports.getDepartmentById = async (req, res, next) => {
  try {
    const departmentId = parseInt(req.params.department_id);

    if (isNaN(departmentId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid department ID",
      });
    }

    const department = await Department.findByPk(departmentId, {
      include: [
        {
          model: db.Factory,
          as: "factory",
          attributes: ["factory_id", "factory_name"],
        },
        {
          model: db.User,
          as: "users",
          attributes: ["user_id", "username", "email"], // Adjust attributes as needed
        },
      ],
    });

    if (!department) {
      return res.status(404).json({
        status: "error",
        message: "Department not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: department,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDepartment = async (req, res, next) => {
  try {
    const departmentId = parseInt(req.params.department_id);
    const { department_name, factory_id } = req.body;

    if (isNaN(departmentId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid department ID",
      });
    }

    // Find the department
    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({
        status: "error",
        message: "Department not found",
      });
    }

    // If updating factory_id, check if new factory exists
    if (factory_id) {
      const factory = await Factory.findByPk(factory_id);
      if (!factory) {
        return res.status(404).json({
          status: "error",
          message: "Factory not found",
        });
      }
    }

    // Build update object with only provided fields
    const updateData = {};
    if (department_name) updateData.department_name = department_name;
    if (factory_id) updateData.factory_id = factory_id;

    // Update the department
    await department.update(updateData);

    // Fetch the updated department with associations
    const updatedDepartment = await Department.findByPk(departmentId, {
      include: [
        {
          model: db.Factory,
          as: "factory",
          attributes: ["factory_id", "factory_name"],
        },
      ],
    });

    res.status(200).json({
      status: "success",
      message: "Department updated successfully",
      data: updatedDepartment,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteDepartment = async (req, res, next) => {
  try {
    const departmentId = parseInt(req.params.department_id);

    if (isNaN(departmentId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid department ID",
      });
    }

    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({
        status: "error",
        message: "Department not found",
      });
    }

    // Check if there are users in this department
    const userCount = await db.User.count({
      where: { user_department: departmentId },
    });

    if (userCount > 0) {
      return res.status(409).json({
        status: "error",
        message: `Cannot delete department with ${userCount} user(s) assigned. Please reassign or remove users first.`,
      });
    }

    await department.destroy();

    res.status(200).json({
      status: "success",
      message: "Department deleted successfully",
      data: {
        deleted_department_id: departmentId,
        department_name: department.department_name,
      },
    });
  } catch (error) {
    next(error);
  }
};
