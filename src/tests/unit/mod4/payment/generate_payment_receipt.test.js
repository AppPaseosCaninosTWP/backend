/**
 * @file payment_controller.test.js
 * @module mod4 - Gestión de Pagos
 * @description Pruebas unitarias para la función `generate_payment_receipt`
 *
 * Casos de prueba cubiertos:
 * 1. ID de pago inválido (400)
 * 2. Pago no encontrado (404)
 * 3. Walk asociado no encontrado (404)
 * 4. Cliente no encontrado (404)
 * 5. Email de cliente inválido (400)
 * 6. Usuario no autorizado (403)
 * 7. Pago no confirmado (400)
 * 8. Generación exitosa (200)
 * 9. Error al enviar email - Autenticación (503)
 * 10. Error al enviar email - Dirección inválida (400)
 * 11. Error interno del servidor (500)
 *
 */

const {
  generate_payment_receipt,
} = require("../../../../controllers/payment_controller");
const {
  payment,
  walk,
  user,
  days_walk,
  walk_type,
} = require("../../../../models/database");
const {
  send_payment_receipt,
} = require("../../../../utils/email/mail_service_payment");

// Mock para isValidEmail que viene del mismo controlador
jest.mock("../../../../controllers/payment_controller", () => {
  const originalModule = jest.requireActual(
    "../../../../controllers/payment_controller"
  );
  return {
    ...originalModule,
    isValidEmail: jest.fn(),
  };
});

// Mocks para modelos y servicios
jest.mock("../../../../models/database", () => ({
  payment: {
    findByPk: jest.fn(),
  },
  walk: {},
  user: {},
  days_walk: {
    findAll: jest.fn(),
  },
  walk_type: {
    findOne: jest.fn(),
  },
}));

jest.mock("../../../../utils/email/mail_service_payment", () => ({
  send_payment_receipt: jest.fn(),
}));

describe("generate_payment_receipt", () => {
  const buildReq = (overrides = {}) => ({
    params: { id: "1", ...overrides.params },
    user: { role_id: 1, user_id: 1, ...overrides.user }, // admin por defecto
  });

  const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const mockPayment = {
    payment_id: 1,
    amount: 10000,
    status: "pagado",
    date: new Date(),
    walk: {
      walk_id: 1,
      walk_type_id: 1,
      comments: "Paseo normal",
      status: "finalizado",
      client_id: 1,
      walker_id: 2,
      client: {
        user_id: 1,
        email: "cliente@example.com",
        name: "Juan Cliente",
      },
      walker: {
        user_id: 2,
        email: "paseador@example.com",
        name: "Ana Paseador",
      },
    },
  };

  const mockWalkDays = [
    {
      start_date: "2023-01-01",
      start_time: "10:00",
      duration: 60,
    },
  ];

  const mockWalkType = {
    name: "Paseo Fijo",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock de isValidEmail con implementación por defecto
    require("../../../../controllers/payment_controller").isValidEmail.mockImplementation(
      (email) => email.includes("@")
    );
    send_payment_receipt.mockResolvedValue(true);
  });

  // 1. ID de pago inválido (400)
  test("retorna 400 si el ID es inválido", async () => {
    const req = buildReq({ params: { id: "abc" } });
    const res = buildRes();

    await generate_payment_receipt(req, res);

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

    await generate_payment_receipt(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg: "Pago no encontrado",
    });
  });

  // 3. Walk asociado no encontrado (404)
  test("retorna 404 si no hay walk asociado", async () => {
    const paymentWithoutWalk = { ...mockPayment, walk: null };
    payment.findByPk.mockResolvedValue(paymentWithoutWalk);
    const req = buildReq();
    const res = buildRes();

    await generate_payment_receipt(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg: "Walk asociado al pago no encontrado",
    });
  });

  // 4. Cliente no encontrado (404)
  test("retorna 404 si no hay cliente asociado", async () => {
    const paymentWithoutClient = {
      ...mockPayment,
      walk: { ...mockPayment.walk, client: null },
    };
    payment.findByPk.mockResolvedValue(paymentWithoutClient);
    const req = buildReq();
    const res = buildRes();

    await generate_payment_receipt(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg: "Cliente del walk no encontrado",
    });
  });

  // 5. Email de cliente inválido (400)
  test("retorna 400 si el email del cliente no es válido", async () => {
    // Mock de payment con email inválido
    const paymentWithInvalidEmail = {
      ...mockPayment,
      walk: {
        ...mockPayment.walk,
        client: {
          ...mockPayment.walk.client,
          email: "invalid-email", // Email claramente inválido
        },
      },
    };

    payment.findByPk.mockResolvedValue(paymentWithInvalidEmail);
    require("../../../../controllers/payment_controller").isValidEmail.mockReturnValue(
      false
    );

    const req = buildReq();
    const res = buildRes();

    await generate_payment_receipt(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg: "Email del cliente no válido",
    });
  });

  // 6. Usuario no autorizado (403)
  test("retorna 403 si el usuario no tiene permisos", async () => {
    payment.findByPk.mockResolvedValue(mockPayment);
    days_walk.findAll.mockResolvedValue(mockWalkDays);
    walk_type.findOne.mockResolvedValue(mockWalkType);

    const req = buildReq({ user: { role_id: 3, user_id: 999 } }); // cliente no dueño
    const res = buildRes();

    await generate_payment_receipt(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg: "No tienes permiso para generar este comprobante",
    });
  });

  // 7. Pago no confirmado (400)
  test("retorna 400 si el pago no está confirmado", async () => {
    const unpaidPayment = { ...mockPayment, status: "pendiente" };
    payment.findByPk.mockResolvedValue(unpaidPayment);
    const req = buildReq();
    const res = buildRes();

    await generate_payment_receipt(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg: "Solo se pueden generar comprobantes para pagos confirmados",
    });
  });

  // 8. Generación exitosa (200)
  test("retorna 200 cuando el comprobante se genera y envía correctamente", async () => {
    payment.findByPk.mockResolvedValue(mockPayment);
    days_walk.findAll.mockResolvedValue(mockWalkDays);
    walk_type.findOne.mockResolvedValue(mockWalkType);

    const req = buildReq();
    const res = buildRes();

    await generate_payment_receipt(req, res);

    expect(send_payment_receipt).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_id: mockPayment.payment_id,
        client_email: mockPayment.walk.client.email,
      })
    );
    expect(res.json).toHaveBeenCalledWith({
      msg: "Comprobante de pago generado y enviado por correo electrónico",
      error: false,
      data: {
        receipt_send_to: mockPayment.walk.client.email,
        payment_id: mockPayment.payment_id,
      },
    });
  });

  // 9. Error al enviar email - Autenticación (503)
  test("retorna 503 cuando hay error de autenticación en el email", async () => {
    payment.findByPk.mockResolvedValue(mockPayment);
    days_walk.findAll.mockResolvedValue(mockWalkDays);
    walk_type.findOne.mockResolvedValue(mockWalkType);

    const emailError = new Error("Auth failed");
    emailError.code = "EAUTH";
    send_payment_receipt.mockRejectedValue(emailError);

    const req = buildReq();
    const res = buildRes();

    await generate_payment_receipt(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Pago confirmado, pero Error de autenticación con el servicio de correo",
      error: true,
      warning: true,
      data: expect.objectContaining({
        payment_id: mockPayment.payment_id,
        email_error: "Error de autenticación con el servicio de correo",
      }),
    });
  });

  // 10. Error al enviar email - Dirección inválida (400)
  test("retorna 400 cuando la dirección de email es inválida", async () => {
    payment.findByPk.mockResolvedValue(mockPayment);
    days_walk.findAll.mockResolvedValue(mockWalkDays);
    walk_type.findOne.mockResolvedValue(mockWalkType);

    const emailError = new Error("Invalid address");
    emailError.responseCode = 550;
    send_payment_receipt.mockRejectedValue(emailError);

    const req = buildReq();
    const res = buildRes();

    await generate_payment_receipt(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Pago confirmado, pero Dirección de correo no válida",
      error: true,
      warning: true,
      data: expect.objectContaining({
        payment_id: mockPayment.payment_id,
        email_error: "Dirección de correo no válida",
      }),
    });
  });

  // 11. Error interno del servidor (500)
  test("retorna 500 cuando ocurre un error inesperado", async () => {
    const originalConsole = console.error;
    console.error = jest.fn();

    payment.findByPk.mockRejectedValue(new Error("Database error"));
    const req = buildReq();
    const res = buildRes();

    await generate_payment_receipt(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Error interno del servidor",
      error: true,
      debug: undefined, // En producción no se muestra el debug
    });

    console.error = originalConsole;
  });
});
