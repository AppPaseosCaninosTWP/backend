const { Router } = require("express");
const {
  create_walk,
  get_all_walks,
  get_walk_by_id,
  get_walk_history,
  get_walk_assigned,
  update_walk_status,
} = require("../../controllers/walk_controller");
const validate_jwt = require("../../middlewares/validate_jwt");
const allow_roles = require("../../middlewares/allow_roles");

const router = Router();
router.use(validate_jwt);

// Crea un nuevo paseo (solo para clientes)
router.post("/", allow_roles(3), create_walk);

// Obtiene todos los paseos visibles según el rol:
// - Admin (1): ve todos los paseos del sistema.
// - Paseador (2): ve paseos asignados y paseos disponibles (pendientes).
// - Cliente (3): ve los paseos que ha solicitado.
router.get("/", allow_roles(1, 2, 3), get_all_walks);
// Permite al paseador consultar el historial de paseos en los que participa.
router.get("/history", allow_roles(2), get_walk_history);
// Permite al paseador conocer si tiene un paseo asignado actualmente.
router.get("/assigned", allow_roles(2), get_walk_assigned);
// Obtiene el detalle de un paseo específico por su ID:
// - Admin: acceso total.
// - Paseador: solo si está asignado o el paseo está pendiente.
// - Cliente: solo si él lo solicitó.
router.get("/:id", allow_roles(1, 2, 3), get_walk_by_id);

// Permite al paseador actualizar el estado de un paseo (aceptar o cancelar).
router.put("/:id/status", allow_roles(1, 2), update_walk_status);

module.exports = router;
