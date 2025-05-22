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

router.post("/create_pet", allow_roles(1, 2, 3), upload_image.single('photo'), create_pet);
router.get("/get_pets", allow_roles(1, 2, 3), get_pets);
router.get("/get_pet_by_id/:id", allow_roles(1, 2, 3), get_pet_by_id);
router.put("/update_pet/:id", allow_roles(1, 2, 3), update_pet);

module.exports = router;
