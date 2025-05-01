const { Router } = require("express");
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

router.post("/", allow_roles(1, 2), create_pet);
router.get("/", allow_roles(1, 2), get_pets);
router.get("/:id", allow_roles(1, 2), get_pet_by_id);
router.put("/:id", allow_roles(1, 2), update_pet);

module.exports = router;
