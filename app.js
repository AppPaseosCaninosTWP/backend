require("dotenv").config();
console.log('Iniciando app.js');
const Server = require("./src/models/server");

const server = new Server();

server.listen();
