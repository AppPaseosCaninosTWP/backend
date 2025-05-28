const { Router } = require("express");
const {
  create_walk,
  get_all_walks,
  get_available_walks,
  get_walk_by_id,
  get_history,
  accept_walk,
  get_assigned_walks,
  cancel_walk,
} = require("../../controllers/walk_controller");
const validate_jwt = require("../../middlewares/validate_jwt");
const allow_roles = require("../../middlewares/allow_roles");

const router = Router();
router.use(validate_jwt);

// Permite al cliente crear un nuevo paseo
router.post("/create_walk", allow_roles(3), create_walk);
// Permite al paseador aceptar un paseo
router.post("/accept",allow_roles(2),accept_walk);
// Permite al paseador cancelar un paseo
router.post("/cancel",allow_roles(2),cancel_walk);

// Obtiene los paseos disponibles
router.get("/available", allow_roles(2), validate_jwt, get_available_walks);
// Permite obtener los paseos del sistema
router.get("/get_all_walks", allow_roles(1, 2, 3), get_all_walks);
// Obtiene un paseo por id
router.get("/get_walk_id/:id", allow_roles(1, 2, 3), get_walk_by_id);
// Permite al paseador ver su historial de paseos en el sistema
router.get('/history', allow_roles(2),validate_jwt, get_history);
// Permite al paseador obtener los paseos que tiene asignados
router.get("/assigned", allow_roles(2), get_assigned_walks);

module.exports = router;