/**
 * @file payment_controller.test.js
 * @module mod4 - Gestión de Pagos
 * @description Pruebas unitarias para la función `update_payment_status`
 *
 * Casos de prueba cubiertos:
 * 1. ID de pago inválido (400)
 * 2. Pago no encontrado (404)
 * 3. Usuario sin permisos (403)
 * 4. Cliente intentando modificar pago de otro (403)
 * 5. Actualización exitosa por admin (200)
 * 6. Actualización exitosa por cliente dueño (200)
 * 7. Error interno del servidor (500)
 *
 */

const {
  update_payment_status,
} = require("../../../../controllers/payment_controller");
const { payment, walk } = require("../../../../models/database");

jest.mock("../../../../models/database", () => ({
  payment: {
    findByPk: jest.fn(),
  },
  walk: {},
}));

describe("update_payment_status", () => {
  const buildReq = (overrides = {}) => ({
    params: { id: "1", ...overrides.params },
    body: { new_status: "pagado", ...overrides.body },
    user: { role_id: 1, user_id: 1, ...overrides.user }, // admin por defecto
  });

  const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. ID de pago inválido (400)
  test("retorna 400 si el ID es inválido", async () => {
    const req = buildReq({ params: { id: "abc" } });
    const res = buildRes();

    await update_payment_status(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg: "ID de pago inválido",
    });
  });

  // 2. Pago no encontrado (404)
  test("retorna 404 si el pago no existe", async () => {
    payment.findByPk.mockResolvedValue(null);
    const req = buildReq();
    const res = buildRes();

    await update_payment_status(req, res);

    expect(payment.findByPk).toHaveBeenCalledWith("1", {
      include: [{ model: walk, as: "walk" }],
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg: "Pago no encontrado",
    });
  });

  // 3. Usuario sin permisos (403)
  test("retorna 403 si el usuario no es admin ni cliente", async () => {
    const mockPayment = {
      walk: { client_id: 1 },
    };
    payment.findByPk.mockResolvedValue(mockPayment);
    const req = buildReq({ user: { role_id: 2, user_id: 2 } }); // walker
    const res = buildRes();

    await update_payment_status(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg: "No tienes permiso para modificar este pago",
    });
  });

  // 4. Cliente intentando modificar pago de otro (403)
  test("retorna 403 si cliente intenta modificar pago de otro", async () => {
    const mockPayment = {
      walk: { client_id: 1 },
    };
    payment.findByPk.mockResolvedValue(mockPayment);
    const req = buildReq({ user: { role_id: 3, user_id: 2 } }); // cliente distinto
    const res = buildRes();

    await update_payment_status(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg: "No puedes modificar pagos que no creaste",
    });
  });

  // 5. Actualización exitosa por admin (200)
  test("retorna 200 cuando admin actualiza estado correctamente", async () => {
    const mockPayment = {
      walk: { client_id: 1 },
      update: jest.fn().mockResolvedValue(true),
    };
    payment.findByPk.mockResolvedValue(mockPayment);
    const req = buildReq({ user: { role_id: 1, user_id: 1 } }); // admin
    const res = buildRes();

    await update_payment_status(req, res);

    expect(mockPayment.update).toHaveBeenCalledWith({ status: "pagado" });
    expect(res.json).toHaveBeenCalledWith({
      error: false,
      msg: "Estado del pago actualizado",
    });
  });

  // 6. Actualización exitosa por cliente dueño (200)
  test("retorna 200 cuando cliente dueño actualiza estado", async () => {
    const mockPayment = {
      walk: { client_id: 1 },
      update: jest.fn().mockResolvedValue(true),
    };
    payment.findByPk.mockResolvedValue(mockPayment);
    const req = buildReq({ user: { role_id: 3, user_id: 1 } }); // cliente dueño
    const res = buildRes();

    await update_payment_status(req, res);

    expect(mockPayment.update).toHaveBeenCalledWith({ status: "pagado" });
    expect(res.json).toHaveBeenCalledWith({
      error: false,
      msg: "Estado del pago actualizado",
    });
  });

  // 7. Error interno del servidor (500)
  test("retorna 500 si ocurre un error inesperado", async () => {
    const originalConsole = console.error;
    console.error = jest.fn();

    payment.findByPk.mockRejectedValue(new Error("Database error"));
    const req = buildReq();
    const res = buildRes();

    await update_payment_status(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg: "Error al actualizar el estado del pago",
    });
    expect(console.error).toHaveBeenCalledWith(
      "Error en update_payment_status:",
      expect.any(Error)
    );

    console.error = originalConsole;
  });
});
