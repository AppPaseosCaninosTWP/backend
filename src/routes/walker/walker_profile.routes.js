const { Router } = require("express");
const {
  create_walker_profile,
  get_all_profiles,
  get_profile_by_id,
  update_walker_profile,
} = require("../../controllers/walker_profile_controller");

const validate_jwt = require("../../middlewares/validate_jwt");
const allow_roles = require("../../middlewares/allow_roles");

const router = Router();

router.use(validate_jwt);
router.post("/", allow_roles(1), create_walker_profile);
router.get("/", allow_roles(1), get_all_profiles);
router.get("/:id", allow_roles(1, 2), get_profile_by_id);
router.put("/:id", allow_roles(1, 2), update_walker_profile);

module.exports = router;
