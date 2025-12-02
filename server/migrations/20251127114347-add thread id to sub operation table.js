// migrations/add-thread-id-to-sub-operation.js
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("sub_operation", "thread_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // Add foreign key constraint
    await queryInterface.addConstraint("sub_operation", {
      fields: ["thread_id"],
      type: "foreign key",
      name: "fk_sub_operation_thread",
      references: {
        table: "thread",
        field: "thread_id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint(
      "sub_operation",
      "fk_sub_operation_thread"
    );
    await queryInterface.removeColumn("sub_operation", "thread_id");
  },
};
