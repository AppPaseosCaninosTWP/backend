const { Router } = require("express");
const upload_image = require("../../middlewares/upload_image");

const {
  create_pet,
  get_pets,
  get_pet_by_id,
  update_pet,
} = require("../../controllers/pet_controller");

const validate_jwt = require("../../middlewares/validate_jwt");
const allow_roles = require("../../middlewares/allow_roles");

const router = Router();
router.use(validate_jwt);

// Permite al cliente registrar una mascota
router.post("/", allow_roles(3), upload_image.single('photo'), create_pet);

// Obtiene las mascotas del sistema
// si un admin (rol 1) llama a esta ruta, obtiene todas las mascotas sin indicar un owner_id, ve todas las mascotas del sistema.
// ejemplo: GET /pet
// si indica un owner_id, obtiene las mascotas de ese dueño.
// ejemplo: GET /pet?owner_id=3
// si un cliente (rol 2) llama a esta ruta, obtiene solo sus mascotas.
router.get("/", allow_roles(1, 3), get_pets);
// Obtiene una mascota por id
router.get("/:id", allow_roles(1, 2, 3), get_pet_by_id);

// Actualiza la informacion de una mascota por id
router.put("/:id", allow_roles(1, 3), update_pet);

module.exports = router;