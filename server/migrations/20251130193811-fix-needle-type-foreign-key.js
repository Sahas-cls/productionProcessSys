// migrations/20251130193811-fix-needle-type-foreign-key.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, check if the incorrect constraint exists and remove it
    try {
      // Try to remove the constraint directly
      await queryInterface.removeConstraint('sub_operation', 'sub_operation_ibfk_4');
      console.log('Removed constraint: sub_operation_ibfk_4');
    } catch (error) {
      console.log('Constraint sub_operation_ibfk_4 not found or already removed');
    }

    // Also try to remove any other needle-related constraints
    try {
      await queryInterface.removeConstraint('sub_operation', 'fk_sub_operation_needle_type_n');
      console.log('Removed constraint: fk_sub_operation_needle_type_n');
    } catch (error) {
      console.log('Constraint fk_sub_operation_needle_type_n not found');
    }

    // Add the correct foreign key constraint
    await queryInterface.addConstraint('sub_operation', {
      fields: ['needle_type_id'],
      type: 'foreign key',
      name: 'fk_sub_operation_needle_type_n',
      references: {
        table: 'needle_type_n',
        field: 'needle_type_id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    console.log('Added correct foreign key constraint');
  },

  async down(queryInterface, Sequelize) {
    // Remove the correct constraint
    try {
      await queryInterface.removeConstraint('sub_operation', 'fk_sub_operation_needle_type_n');
      console.log('Removed constraint in down migration');
    } catch (error) {
      console.log('Constraint not found during down migration');
    }
  }
};