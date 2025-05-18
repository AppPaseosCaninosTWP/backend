"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert("walker_profile", [
      {
        walker_id: 2, // main walker
        experience: 2,
        walker_type: "esporádico",
        zone: "centro",
        photo: "foto.jpg",
        description: "amante de los animales, especializado en paseos urbanos",
        balance: 0,
        on_review: true,
      },
      {
        walker_id: 4, // Ana Walker
        experience: 3,
        walker_type: "fijo",
        zone: "centro",
        photo: "ana.jpg",
        description:
          "Especialista en paseos urbanos y sociabilización de perros.",
        balance: 0,
        on_review: false,
      },
      {
        walker_id: 5, // Carlos Walker
        experience: 2,
        walker_type: "esporádico",
        zone: "norte",
        photo: "carlos.jpg",
        description:
          "Responsable, ideal para paseos en parques y zonas abiertas.",
        balance: 0,
        on_review: false,
      },
      {
        walker_id: 6, // Laura Walker
        experience: 5,
        walker_type: "fijo",
        zone: "sur",
        photo: "laura.jpg",
        description:
          "Experiencia con razas grandes y perros con necesidades especiales.",
        balance: 0,
        on_review: false,
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("walker_profile", { walker_id: 2 });
  },
};
