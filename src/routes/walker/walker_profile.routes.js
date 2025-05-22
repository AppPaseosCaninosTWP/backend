const { Router } = require("express");
const {
  create_walker_profile,
  get_all_profiles,
  get_profile_by_id,
  update_walker_profile,
  get_change_requests,
  get_change_request_by_id,
  approve_change_request,
  reject_change_request
} = require("../../controllers/walker_profile_controller");

const validate_jwt = require("../../middlewares/validate_jwt");
const allow_roles = require("../../middlewares/allow_roles");
const upload_image    = require("../../middlewares/upload_image");

const router = Router();
router.use(validate_jwt);

router.post("/register_walker", allow_roles(1), upload_image.single("photo"), create_walker_profile);
router.get("/get_profiles", allow_roles(1), get_all_profiles);
router.get("/get_profile/:id", allow_roles(1, 2, 3), get_profile_by_id);
router.put("/update_walker_profile/:id", allow_roles(2), upload_image.single("photo"), update_walker_profile);
router.get   ("/requests", allow_roles(1), get_change_requests);
router.get   ("/requests_info/:id", allow_roles(1), get_change_request_by_id);
router.post  ("/requests/:id/approve", allow_roles(1), approve_change_request);
router.post  ("/requests/:id/reject", allow_roles(1), reject_change_request);

module.exports = router;
