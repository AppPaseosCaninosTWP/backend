"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("user", {
      user_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      is_enable: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      ticket: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      role_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "role",
          key: "role_id",
        },
        allowNull: false,
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      reset_code: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      reset_code_expires: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("user");
  },
};
