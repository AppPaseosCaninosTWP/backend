'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('rating', [
      // Paseo finalizado walk_id = 4 (client_id:10, walker_id:6)
      {
        rating_id:    1,
        value:        4.5,
        comment:      'Mascota muy tranquila y obediente',
        sender_id:    6,   // walker → califica a client
        receiver_id:  10,  // client
        walk_id:      4,
        created_at:   new Date(),
        updated_at:   new Date()
      },
      {
        rating_id:    2,
        value:        5.0,
        comment:      'Paseador muy amable y puntual',
        sender_id:    10,  // client → califica a walker
        receiver_id:  6,   // walker
        walk_id:      4,
        created_at:   new Date(),
        updated_at:   new Date()
      },

      // Paseo finalizado walk_id = 9 (client_id:11, walker_id:2)
      {
        rating_id:    3,
        value:        3.0,
        comment:      'Buen servicio, pero un poco veloz',
        sender_id:    2,   // walker → califica a client
        receiver_id:  11,  // client
        walk_id:      9,
        created_at:   new Date(),
        updated_at:   new Date()
      },
      {
        rating_id:    4,
        value:        4.0,
        comment:      'Cliente muy organizado con horarios',
        sender_id:    11,  // client → califica a walker
        receiver_id:  2,   // walker
        walk_id:      9,
        created_at:   new Date(),
        updated_at:   new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('rating', {
      rating_id: { [Sequelize.Op.in]: [1, 2, 3, 4] }
    }, {});
  }
};
