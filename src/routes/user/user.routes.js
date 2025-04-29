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

router.get("/", allow_roles(1), get_users);
router.get("/:id", allow_roles(1), get_user_by_id);
router.put("/:id", allow_roles(1), update_is_enable);

router.post("/request_reset_code", request_reset_code);


module.exports = router;
