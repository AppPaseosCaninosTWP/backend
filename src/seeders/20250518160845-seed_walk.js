"use strict";
const dayjs = require("dayjs");

module.exports = {
  up: async (queryInterface) => {
    const walks = [
      // PENDIENTE: creado, aún no aceptado
      {
        walk_id: 1,
        walk_type_id: 1,
        comments: "Esperando confirmación de Ana",
        status: "pendiente",
        client_id: 7,
        walker_id: null,
      },

      // CONFIRMADO: ya asignado, pero aún no ocurrió
      {
        walk_id: 2,
        walk_type_id: 1,
        comments: "Carlos confirmó para Rocky",
        status: "confirmado",
        client_id: 8,
        walker_id: 5,
      },

      // CANCELADO: cliente canceló
      {
        walk_id: 3,
        walk_type_id: 1,
        comments: "Cancelado por el cliente (mal clima)",
        status: "cancelado",
        client_id: 9,
        walker_id: 6,
      },

      // FINALIZADO: paseo exitoso
      {
        walk_id: 4,
        walk_type_id: 1,
        comments: "Paseo completado por Laura",
        status: "finalizado",
        client_id: 10,
        walker_id: 6,
      },

      // CONFIRMADO: asignado para mañana
      {
        walk_id: 5,
        walk_type_id: 1,
        comments: "Confirmado por Ana para Max",
        status: "confirmado",
        client_id: 11,
        walker_id: 4,
      },
    ];

    const pet_walks = [
      { walk_id: 1, pet_id: 1 }, // Max (pendiente)

      { walk_id: 2, pet_id: 5 }, // Rocky (confirmado)

      { walk_id: 3, pet_id: 10 }, // Bruno (cancelado)

      { walk_id: 4, pet_id: 13 }, // Nina (finalizado)

      { walk_id: 5, pet_id: 15 }, // Daisy (confirmado)
      { walk_id: 5, pet_id: 16 }, // Rocco
    ];

    const days_walks = [
      {
        walk_id: 1,
        start_date: dayjs().add(2, "day").format("YYYY-MM-DD"),
        start_time: "10:00",
        duration: 60,
      },
      {
        walk_id: 2,
        start_date: dayjs().add(1, "day").format("YYYY-MM-DD"),
        start_time: "09:00",
        duration: 30,
      },
      {
        walk_id: 3,
        start_date: dayjs().subtract(1, "day").format("YYYY-MM-DD"),
        start_time: "08:00",
        duration: 60,
      },
      {
        walk_id: 4,
        start_date: dayjs().subtract(2, "day").format("YYYY-MM-DD"),
        start_time: "07:30",
        duration: 30,
      },
      {
        walk_id: 5,
        start_date: dayjs().add(3, "day").format("YYYY-MM-DD"),
        start_time: "11:30",
        duration: 60,
      },
    ];

    await queryInterface.bulkInsert("walk", walks);
    await queryInterface.bulkInsert("pet_walk", pet_walks);
    await queryInterface.bulkInsert("days_walk", days_walks);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("days_walk", null, {});
    await queryInterface.bulkDelete("pet_walk", null, {});
    await queryInterface.bulkDelete("walk", null, {});
  },
};
