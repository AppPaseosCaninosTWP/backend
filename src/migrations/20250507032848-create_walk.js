"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("walk", {
      walk_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      walk_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "walk_type", key: "walk_type_id" },
      },
      comments: Sequelize.TEXT,
      status: Sequelize.STRING,
      client_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "user", key: "user_id" },
      },
      walker_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "user", key: "user_id" },
      },
      request_id: {
        type: Sequelize.INTEGER,
        references: { model: "request_announcement", key: "request_id" },
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("walk");
  },
};
