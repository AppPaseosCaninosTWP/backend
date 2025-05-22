const { Router } = require("express");
const {
  create_walk,
  get_all_walks,
  get_available_walks,
  get_walk_by_id,
  accept_walk,
  get_assigned_walks,
  cancel_walk,
} = require("../../controllers/walk_controller");
const validate_jwt = require("../../middlewares/validate_jwt");
const allow_roles = require("../../middlewares/allow_roles");

const router = Router();
router.use(validate_jwt);

router.get("/available", allow_roles(2), validate_jwt, get_available_walks);
router.post("/create_walk", allow_roles(3), create_walk);
router.get("/get_all_walks", allow_roles(1, 2, 3), get_all_walks);
router.get("/assigned", allow_roles(2), get_assigned_walks);
router.post("/accept",allow_roles(2),accept_walk);
router.post("/cancel",allow_roles(2),cancel_walk);
router.get("/get_walk_id/:id", allow_roles(1, 2, 3), get_walk_by_id);


module.exports = router;
