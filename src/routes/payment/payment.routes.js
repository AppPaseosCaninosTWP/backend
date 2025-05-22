const { Router } = require("express");
const {
  createPayment,
  processPayment,
  verifyCommission,
  getBalance,
  generateReceipt,
  paymentHistory,
} = require("../../controllers/payment_controller");

const validate_jwt = require("../middlewares/validate_jwt");

const router = Router();

// Rutas de pagos
router.post("/", validate_jwt, createPayment);
router.post("/:payment_id/process", validate_jwt, processPayment);
router.post("/:payment_id/verify-commission", validate_jwt, verifyCommission);
router.get("/walker/:walker_id/balance", validate_jwt, getBalance);
router.get("/:payment_id/receipt", validate_jwt, generateReceipt);
router.get("/walker/:walker_id/history", validate_jwt, paymentHistory);

module.exports = router;