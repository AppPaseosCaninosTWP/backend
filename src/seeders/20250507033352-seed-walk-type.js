'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('walk_type', [
      { walk_type_id: 1, name: 'Fijo' },
      { walk_type_id: 2, name: 'Esporádico' }
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('walk_type', {
      walk_type_id: { [queryInterface.sequelize.Op.in]: [1, 2] }
    });
  }
};
