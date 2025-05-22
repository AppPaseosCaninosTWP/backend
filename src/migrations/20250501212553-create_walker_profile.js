"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("walker_profile", {
      walker_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: {
          model: "user",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      experience: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      walker_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      zone: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      photo: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      balance: {
        type: Sequelize.DECIMAL,
        defaultValue: 0,
      },
      on_review: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
       update_requested: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      pending_changes: {
        type: Sequelize.JSON,   
        allowNull: true
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("walker_profile");
  },
};
