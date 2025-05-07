"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("pet_walk", {
      walk_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "walk", key: "walk_id" },
        onDelete: "CASCADE",
      },
      pet_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "pet", key: "pet_id" },
        onDelete: "CASCADE",
      },
    });

    await queryInterface.addConstraint("pet_walk", {
      fields: ["walk_id", "pet_id"],
      type: "primary key",
      name: "pk_pet_walk",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("pet_walk");
  },
};
