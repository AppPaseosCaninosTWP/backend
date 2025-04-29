const { Router } = require("express");
const {
  login_user,
  register_user,
} = require("../../controllers/auth_controller");
const validate_jwt = require("../../middlewares/validate_jwt");

const router = Router();

router.post("/login", login_user);

console.log("Cargando ruta: POST /register");
router.post("/register", register_user);

router.get("/verify", validate_jwt, (req, res) => {
  return res.json({
    msg: "Token válido",
    user: req.user,
  });
});

module.exports = router;
