const express = require('express');
const router = express.Router();

// Define tus rutas aquí
router.get('/', (req, res) => {
  res.send('Hello World!');
});

module.exports = router;