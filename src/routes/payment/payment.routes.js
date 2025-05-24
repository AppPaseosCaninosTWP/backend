const { Router } = require("express");
const {
  create_payment,
  process_payment,
  verify_commission,
  get_balance,
  generate_receipt,
  payment_history,
} = require("../../controllers/payment_controller");

const validate_jwt = require("../../middlewares/validate_jwt");

const router = Router();

router.use(validate_jwt);
router.post("/create_payment", create_payment);
router.post("/process_payment/:payment_id", process_payment);
router.post("/:payment_id/verify", verify_commission);
router.get("/walker/:walker_id/balance", get_balance);
router.get("/:payment_id/receipt", generate_receipt);
router.get("/walkers/:walker_id/history", payment_history);


module.exports = router;