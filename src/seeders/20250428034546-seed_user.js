"use strict";

const bcrypt = require("bcryptjs");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const admin_password = await bcrypt.hash("admin123", 10);
    const walker_password = await bcrypt.hash("walker123", 10);
    const client_password = await bcrypt.hash("client123", 10);
    const common_password = await bcrypt.hash("Test1234", 10);

    await queryInterface.bulkInsert("user", [
      // Usuarios base del sistema
      {
        name: "main_admin",
        email: "admin@example.com",
        phone: "999999999",
        password: admin_password,
        is_enable: true,
        ticket: false,
        role_id: 1,
      },
      {
        name: "main_walker",
        email: "walker@example.com",
        phone: "999999999",
        password: walker_password,
        is_enable: true,
        ticket: true,
        role_id: 2,
      },
      {
        name: "main_client",
        email: "client@example.com",
        phone: "999999999",
        password: client_password,
        is_enable: true,
        ticket: true,
        role_id: 3,
      },
      // Paseadores
      {
        name: "Ana Walker",
        email: "ana@twp.com",
        phone: "911111111",
        password: common_password,
        role_id: 2,
        is_enable: true,
        ticket: false,
      },
      {
        name: "Carlos Walker",
        email: "carlos@twp.com",
        phone: "922222222",
        password: common_password,
        role_id: 2,
        is_enable: true,
        ticket: false,
      },
      {
        name: "Laura Walker",
        email: "laura@twp.com",
        phone: "933333333",
        password: common_password,
        role_id: 2,
        is_enable: true,
        ticket: false,
      },

      // Clientes
      {
        name: "Pedro Cliente",
        email: "pedro@twp.com",
        phone: "944444444",
        password: common_password,
        role_id: 3,
        is_enable: true,
        ticket: false,
      },
      {
        name: "Lucía Cliente",
        email: "lucia@twp.com",
        phone: "955555555",
        password: common_password,
        role_id: 3,
        is_enable: true,
        ticket: false,
      },
      {
        name: "Mario Cliente",
        email: "mario@twp.com",
        phone: "966666666",
        password: common_password,
        role_id: 3,
        is_enable: true,
        ticket: false,
      },
      {
        name: "Sara Cliente",
        email: "sara@twp.com",
        phone: "977777777",
        password: common_password,
        role_id: 3,
        is_enable: true,
        ticket: false,
      },
      {
        name: "David Cliente",
        email: "david@twp.com",
        phone: "988888888",
        password: common_password,
        role_id: 3,
        is_enable: true,
        ticket: false,
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("user", null, {});
  },
};
