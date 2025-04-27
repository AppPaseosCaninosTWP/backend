const express = require("express");
const cors = require("cors");
const logger = require("morgan");
const sequelize = require("./database/sequelize");

class Server {
  constructor() {
    console.log("Iniciando Server class");
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.paths = {};

    this.dbConnection();
    this.middlewares();
    this.routes();
  }

  async dbConnection() {
    try {
      await sequelize.authenticate();
      console.log("Database connected successfully (SQLite)");
    } catch (error) {
      console.error(error);
      throw new Error("Error connecting to the database");
    }
  }

  middlewares() {
    this.app.use(logger("dev"));
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static("public"));
  }

  routes() {
    this.app.get("/", (req, res) => {
      res.json({
        message: "API running",
      });
    });
  }

  listen() {
    this.app.listen(this.port, () => {
      console.log(`Server running on port ${this.port}`);
    });
  }
}

module.exports = Server;
