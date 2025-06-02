const { Router } = require("express");
const {
  get_all_payments,
  get_payment_by_id,
  update_payment_status,
} = require("../../controllers/payment_controller");

const validate_jwt = require("../../middlewares/validate_jwt");
const allow_roles = require("../../middlewares/allow_roles");

const router = Router();
router.use(validate_jwt);

router.put("/:id/status", allow_roles(3), update_payment_status);

router.get("/:id", allow_roles(1, 2, 3), get_payment_by_id);

router.get("/", allow_roles(1, 2, 3), get_all_payments);

module.exports = router;