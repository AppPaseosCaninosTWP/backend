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
router.post("/create_pet", allow_roles(1, 2, 3), upload_image.single('photo'), create_pet);

// Obtiene las mascotas del sistema
router.get("/get_pets", allow_roles(1, 2, 3), get_pets);
// Obtiene una mascota por id
router.get("/get_pet_by_id/:id", allow_roles(1, 2, 3), get_pet_by_id);
// Actualiza la informacion de una mascota por id
router.put("/update_pet/:id", allow_roles(1, 2, 3), update_pet);

module.exports = router;
