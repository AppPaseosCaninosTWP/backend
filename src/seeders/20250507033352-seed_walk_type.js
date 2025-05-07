'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('walk_type', [
      { walk_type_id: 1, name: 'Fijo' },
      { walk_type_id: 2, name: 'Esporádico' }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("walk_type", {
      walk_type_id: { [Sequelize.Op.in]: [1, 2] }
    });
  }
};
