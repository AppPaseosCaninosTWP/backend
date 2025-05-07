"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("days_walk", {
      walk_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "walk",
          key: "walk_id",
        },
        onDelete: "CASCADE",
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      start_time: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
    });
    await queryInterface.addConstraint("days_walk", {
      fields: ["walk_id", "start_date"],
      type: "primary key",
      name: "pk_days_walk",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("days_walk");
  },
};
