const { Sequelize } = require("sequelize");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "twp_db.sqlite",
});

module.exports = sequelize;
