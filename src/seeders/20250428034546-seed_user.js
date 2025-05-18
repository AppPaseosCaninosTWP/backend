"use strict";

const bcrypt = require("bcryptjs");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const admin_password = await bcrypt.hash("admin123", 10);
    const walker_password = await bcrypt.hash("walker123", 10);
    const client_password = await bcrypt.hash("client123", 10);

    await queryInterface.bulkInsert(
      "user",
      [
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
      ],
      {}
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("user", null, {});
  },
};
