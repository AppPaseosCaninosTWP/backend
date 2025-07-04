const { Router } = require("express");
const {
  get_walk_ratings,
  list_ratings,
  get_user_ratings,
  create_rating,
} = require("../../controllers/rating_controller");
const allow_roles = require("../../middlewares/allow_roles");
const validate_jwt = require("../../middlewares/validate_jwt");

const router = Router();
router.use(validate_jwt);

// Rutas para manejar las calificaciones
// Obtiene las calificaciones de un paseo
router.get('/walk_ratings/:walk_id', allow_roles(1,2,3), get_walk_ratings);
// Lista todas las calificaciones paginadas de 10 en 10
router.get('/', allow_roles(1,2,3), list_ratings);    
// Obtiene las calificaciones de un usuario y su promedio          
router.get('/user_ratings/:user_id', allow_roles(1,2,3), get_user_ratings); 
// Crear una calificación
router.post('/', validate_jwt, allow_roles(1, 2, 3), create_rating);

module.exports = router;
