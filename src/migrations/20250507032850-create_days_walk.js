"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("days_walk", {
      walk_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: { model: "walk", key: "walk_id" },
      },
      start_date: Sequelize.DATEONLY,
      start_time: Sequelize.TIME,
      duration: Sequelize.INTEGER,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("days_walk");
  },
};
