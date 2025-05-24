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
      //Paseo utilizado para probar el redireccionamiento a whatsapp
      // CONFIRMADO: asignado para mañana
      {
        walk_id: 5,
        walk_type_id: 2,
        comments: "prueba redireccionamiento a wsp",
        status: "confirmado",
        client_id: 12, //cliente_wsp
        walker_id: 13, //paseador_wsp
      },

      // --- Paseos nuevos para walker_id = 2 ---
    {
      walk_id: 6,
      walk_type_id: 1,              // Fijo
      comments: "Paseo fijo semanal para Max",
      status: "pendiente",
      client_id: 7,
      walker_id: null,
    },
    {
      walk_id: 7,
      walk_type_id: 2,              // Esporádico
      comments: "Paseo esporádico matutino para Rocky",
      status: "pendiente",
      client_id: 8,
      walker_id: null,
    },
    {
      walk_id: 8,
      walk_type_id: 2,              // Esporádico
      comments: "Paseo esporádico vespertino para Bruno",
      status: "pendiente",
      client_id: 9,
      walker_id: null,
    },
    // FINALIZADO para walker_id = 2 (para probar el historial)
    {
      walk_id:      9,
      walk_type_id: 1,      // o el tipo que quieras
      comments:     "Paseo finalizado de prueba para el paseador 2",
      status:       "finalizado",
      client_id:    11,     // un cliente cualquiera que exista en tu seed de users
      walker_id:    2,      // ESTE es el paseador con id 2
    },

    ];

    const pet_walks = [
      { walk_id: 1, pet_id: 1 }, // Max (pendiente)
      { walk_id: 2, pet_id: 5 }, // Rocky (confirmado)
      { walk_id: 3, pet_id: 10 }, // Bruno (cancelado)
      { walk_id: 4, pet_id: 13 }, // Nina (finalizado)
      { walk_id: 5, pet_id: 18 }, // pet_walk de prueba para el redireccionamiento a wsp (confirmado)
      { walk_id: 5, pet_id: 16 }, // Rocco
      { walk_id: 6, pet_id: 3 },  // Max
      { walk_id: 7, pet_id: 7 },  // Rocky
      { walk_id: 8, pet_id: 9 },  // Bruno
      { walk_id: 9, pet_id: 4 },  // Luna
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
      // --- Fechas y horas de los nuevos paseos ---
      {
        walk_id: 6,
        start_date: dayjs().add(4, "day").format("YYYY-MM-DD"),
        start_time: "09:30",
        duration: 45,
      },
      {
        walk_id: 7,
        start_date: dayjs().add(1, "day").format("YYYY-MM-DD"),
        start_time: "08:00",
        duration: 30,
      },
      {
        walk_id: 8,
        start_date: dayjs().add(2, "day").format("YYYY-MM-DD"),
        start_time: "18:00",
        duration: 60,
      },
      {
        walk_id:    9,
        start_date: dayjs().subtract(3, "day").format("YYYY-MM-DD"),
        start_time: "15:00",
        duration:   45,
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
