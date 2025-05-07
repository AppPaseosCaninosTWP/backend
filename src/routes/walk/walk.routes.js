const { Router } = require("express");
const {
  create_walk,
  get_all_walks,
  get_walk_by_id,
} = require("../../controllers/walk_controller");
const validate_jwt = require("../../middlewares/validate_jwt");
const allow_roles = require("../../middlewares/allow_roles");

const router = Router();
router.use(validate_jwt);

router.post("/", allow_roles(3), create_walk);
router.get("/", allow_roles(1, 2, 3), get_all_walks);
router.get("/:id", allow_roles(1, 2, 3), get_walk_by_id);

module.exports = router;
