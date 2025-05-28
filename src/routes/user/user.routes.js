const { Router } = require("express");
const {
  get_users,
  get_user_by_id,
  update_is_enable,
  request_reset_code
} = require("../../controllers/user_controller");
const validate_jwt = require("../../middlewares/validate_jwt");
const allow_roles = require("../../middlewares/allow_roles");

const router = Router();
router.use(validate_jwt);

// Envia el codigo para restablecer la contraseña al email 
router.post("/request_reset_code", request_reset_code);

// Permite al administrador obtener todos los usuarios del sistema
router.get("/get_all_user", allow_roles(1), get_users);
// Permite al administrador obtener un usuario por id
router.get("/get_user_id/:id", allow_roles(1), get_user_by_id);

// Permite al administrador inhabilitar a un usuario del sistema
router.put("/is_enable/:id", allow_roles(1), update_is_enable);

module.exports = router;