const { Router } = require("express");
const {
  login_user,
  register_user,
  logout,
  request_password_reset,
  reset_password,
} = require("../../controllers/auth_controller");
const validate_jwt = require("../../middlewares/validate_jwt");

const router = Router();

// Permite iniciar sesion
router.post("/login", login_user);
// Permite registrarse
router.post("/register", register_user);
// Envia el codigo para restablecer la contraseña al email 
router.post("/request_password_reset", request_password_reset);
// Permite restablecer la contraseña
router.post("/reset_password", reset_password);
// Permite cerrar sesion
router.post("/logout", logout);

// Verifica que el JWT es valido
router.get("/verify", validate_jwt, (req, res) => {
  return res.json({
    msg: "Token válido",
    user: req.user,
  });
});

module.exports = router;
