const { Router } = require("express");
const {
  get_users,
  get_user_by_id,
  update_is_enable,
  verify_reset_code,
} = require("../../controllers/user_controller");
const validate_jwt = require("../../middlewares/validate_jwt");
const allow_roles = require("../../middlewares/allow_roles");

const router = Router();
router.post("/verify_reset_code", verify_reset_code);

router.use(validate_jwt);

// Permite al administrador obtener todos los usuarios del sistema
router.get("/", allow_roles(1), get_users);
// Permite al administrador obtener un usuario por id
router.get("/:id", allow_roles(1), get_user_by_id);

// Permite al administrador inhabilitar a un usuario del sistema
router.put("/:id/status", allow_roles(1), update_is_enable);

module.exports = router;