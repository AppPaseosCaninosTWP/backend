const { Router } = require("express");
const {
  createPayment,
  processPayment,
  verifyCommission,
  getBalance,
  generateReceipt,
  paymentHistory,
} = require("../../controllers/payment_controller");

const validate_jwt = require("../../middlewares/validate_jwt");

const router = Router();

router.use(validate_jwt);
router.post("/create_payment", createPayment);
router.post("/process_payment/:payment_id", processPayment);
router.post("/:payment_id/verify", verifyCommission);
router.get("/walker/:walker_id/balance", getBalance);
router.get("/:payment_id/receipt", generateReceipt);
router.get("/walkers/:walker_id/history", paymentHistory);


module.exports = router;