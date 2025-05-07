"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert("walker_profile", [
      {
        walker_id: 2,
        name: "Felipe González",
        experience: 2,
        walker_type: "esporádico",
        zone: "centro",
        photo: "felipe.jpg",
        description: "amante de los animales, especializado en paseos urbanos",
        balance: 0,
        on_review: true,
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("walker_profile", { walker_id: 2 });
  },
};
