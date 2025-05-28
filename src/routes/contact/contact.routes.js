const { Router } = require("express");
const { 
    redirect_whatsapp, 
} = require("../../controllers/contact_controller");

const validate_jwt = require("../../middlewares/validate_jwt");
const allow_roles = require("../../middlewares/allow_roles");

const router = Router();
router.use(validate_jwt);

// Obtiene el link de redireccionamiento al chat de whatsapp web
router.get("/:id", allow_roles(2, 3), redirect_whatsapp);

module.exports = router;
