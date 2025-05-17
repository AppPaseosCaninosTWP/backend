const { Router } = require("express");
const {
  login_user,
  register_user,
  request_password_reset,
  reset_password,
} = require("../../controllers/auth_controller");
const validate_jwt = require("../../middlewares/validate_jwt");

const router = Router();

router.post("/login", login_user);
router.post("/register", register_user);

// Nuevo: solicitar código
router.post("/request-password-reset", request_password_reset);

// Nuevo: restablecer contraseña
router.post("/reset-password", reset_password);

router.get("/verify", validate_jwt, (req, res) => {
  return res.json({
    msg: "Token válido",
    user: req.user,
  });
});

module.exports = router;
