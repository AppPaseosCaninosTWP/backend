const { Router } = require("express");
const {
  create_user,
  get_users,
  get_user_by_id,
} = require("../../controllers/user_controller");

const router = Router();

router.post("/", create_user);
router.get("/", get_users);
router.get("/:id", get_user_by_id);

module.exports = router;
