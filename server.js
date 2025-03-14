const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const routes = require('./src/routes');
const errorMiddleware = require('./src/middlewares/error');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api', routes);

// Manejo de errores
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});