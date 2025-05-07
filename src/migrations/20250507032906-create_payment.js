"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("payment", {
      payment_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      amount: Sequelize.DECIMAL,
      date: Sequelize.DATE,
      status: Sequelize.STRING,
      walk_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "walk", key: "walk_id" },
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("payment");
  },
};
