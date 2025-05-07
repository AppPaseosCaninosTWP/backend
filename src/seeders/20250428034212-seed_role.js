'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert("role", [
      { role_id: 1, name: "admin" },
      { role_id: 2, name: "walker" },
      { role_id: 3, name: "client" },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("role", null, {});
  },
};
