"use strict";
const dayjs = require("dayjs");

module.exports = {
  up: async (queryInterface) => {
    // Seeders para la tabla payment con precios en CLP
    const payments = [
      // Pago pendiente para walk pendiente (ID 1) - 60 minutos
      {
        amount: 10000,
        date: dayjs().format("YYYY-MM-DD"),
        status: "pendiente",
        walk_id: 1,
      },
      // Pago pagado para walk confirmado (ID 2) - 30 minutos
      {
        amount: 5000,
        date: dayjs().subtract(1, "day").format("YYYY-MM-DD"),
        status: "pagado",
        walk_id: 2,
      },
      // Pago cancelado para walk cancelado (ID 3) - 60 minutos
      {
        amount: 10000,
        date: dayjs().subtract(2, "day").format("YYYY-MM-DD"),
        status: "cancelado",
        walk_id: 3,
      },
      // Pago pagado para walk finalizado (ID 4) - 30 minutos
      {
        amount: 5000,
        date: dayjs().subtract(1, "day").format("YYYY-MM-DD"),
        status: "pagado",
        walk_id: 4,
      },
      // Pago pendiente para walk de prueba WSP (ID 5) - 60 minutos
      {
        amount: 10000,
        date: dayjs().format("YYYY-MM-DD"),
        status: "pendiente",
        walk_id: 5,
      },
      // Pago pendiente para walk fijo semanal (ID 6) - 45 minutos (proporcional: 7500)
      {
        amount: 7500,
        date: dayjs().format("YYYY-MM-DD"),
        status: "pendiente",
        walk_id: 6,
      },
      // Pago pendiente para walk esporádico matutino (ID 7) - 30 minutos
      {
        amount: 5000,
        date: dayjs().format("YYYY-MM-DD"),
        status: "pendiente",
        walk_id: 7,
      },
      // Pago pendiente para walk esporádico vespertino (ID 8) - 60 minutos
      {
        amount: 10000,
        date: dayjs().format("YYYY-MM-DD"),
        status: "pendiente",
        walk_id: 8,
      },
      // Pago pagado para walk finalizado del paseador 2 (ID 9) - 45 minutos (proporcional: 7500)
      {
        amount: 7500,
        date: dayjs().subtract(3, "day").format("YYYY-MM-DD"),
        status: "pagado",
        walk_id: 9,
      },
    ];

    await queryInterface.bulkInsert("payment", payments);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("payment", null, {});
  },
};