'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('pet', [
      {
        name: 'Firulais',
        breed: 'Labrador',
        age: 3,
        zone: 'Centro',
        description: 'Perro muy activo y juguetón',
        comments: 'Le gusta correr mucho',
        medical_condition: 'Ninguna',
        photo: 'firulais.jpg',
        owner_id: 3 
      },
      {
        name: 'Luna',
        breed: 'Poodle',
        age: 5,
        zone: 'Norte',
        description: 'Tranquila y obediente',
        comments: 'Tiene miedo a los ruidos fuertes',
        medical_condition: 'Asma',
        photo: 'luna.jpg',
        owner_id: 3
      }
    ], {});
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('pet', null, {});
  }
};
