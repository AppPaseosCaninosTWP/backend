const { Router } = require("express");
const {
  get_all_payments,
  get_payment_by_id,
  update_payment_status,
  generate_payment_receipt,
  assign_payment_to_walker,
} = require("../../controllers/payment_controller");

const validate_jwt = require("../../middlewares/validate_jwt");
const allow_roles = require("../../middlewares/allow_roles");

const router = Router();
router.use(validate_jwt);

// Permite al cliente actualizar el estado de un pago de "pendiente" a "pagado"
// - Solo se permite si el payment está en estado "pendiente"
// - El cambio a "pagado" activa pasos posteriores (como asignación al paseador)
router.put("/:id/status", allow_roles(3), update_payment_status);

// Permite obtener un payment por id
router.get("/:id", allow_roles(1, 2, 3), get_payment_by_id);
// - Admin (1): ve todos los payments del sistema
// - Paseador (2): ve todos los pagos donde fue asignado como paseador
// - Cliente (3): ve todos los pagos donde fue el cliente del paseo
router.get("/", allow_roles(1, 2, 3), get_all_payments);

// Genera y envía por correo electrónico un comprobante del pago
// - Solo disponible si el pago está en estado "pagado"
// - El comprobante se envía al correo del cliente asociado
router.post("/:id/receipt", allow_roles(1, 2, 3), generate_payment_receipt);
// Asigna oficialmente un pago al paseador, calcula montos y envía notificación
// Solo se puede asignar si:
// - El pago está en estado "pagado"
// - Aún no ha sido asignado previamente
// - El paseo tiene un paseador asignado
router.post("/:id/assign", allow_roles(1, 2), assign_payment_to_walker);

module.exports = router;