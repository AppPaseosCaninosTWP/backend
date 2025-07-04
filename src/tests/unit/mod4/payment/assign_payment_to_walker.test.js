/**
 * @file payment_controller.test.js
 * @module mod4 - Gestión de Pagos
 * @description Pruebas unitarias para la función `assign_payment_to_walker`
 *
 * Casos de prueba cubiertos:
 * 1. ID de pago inválido (400)
 * 2. Pago no encontrado (404)
 * 3. Usuario no admin (403)
 * 4. Pago no confirmado (400)
 * 5. Pago ya asignado (400)
 * 6. Paseador no asignado (400)
 * 7. Asignación exitosa (200)
 * 8. Error al notificar paseador (500)
 * 9. Perfil de paseador no encontrado (404)
 * 10. Error interno del servidor (500)
 *
 */

const {
  assign_payment_to_walker,
} = require("../../../../controllers/payment_controller");
const {
  payment,
  walk,
  user,
  days_walk,
  walk_type,
  walker_profile,
} = require("../../../../models/database");
const {
  send_payment_notification_to_walker,
} = require("../../../../services/email_service");

jest.mock("../../../../models/database", () => ({
  payment: {
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  walk: {},
  user: {},
  days_walk: {},
  walk_type: {},
  walker_profile: {
    findByPk: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("../../../../services/email_service");

describe("assign_payment_to_walker", () => {
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
    walker_assigned: false,
    walk_id: 1,
    update: jest.fn().mockImplementation(async (data) => {
      Object.assign(mockPayment, data);
      return mockPayment;
    }),
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
      days: [
        {
          start_date: "2023-01-01",
          duration: 60,
        },
      ],
      walk_type: {
        name: "Paseo Fijo",
      },
    },
  };

  const mockWalkerProfile = {
    walker_id: 2,
    balance: 5000,
    update: jest.fn().mockImplementation(async (data) => {
      Object.assign(mockWalkerProfile, data);
      return mockWalkerProfile;
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    send_payment_notification_to_walker.mockResolvedValue(true);
    payment.findByPk.mockResolvedValue({ ...mockPayment });
    walker_profile.findByPk.mockResolvedValue({ ...mockWalkerProfile });
    payment.create.mockResolvedValue({});
  });

  // 1. ID de pago inválido (400)
  test("retorna 400 si el ID es inválido", async () => {
    const req = buildReq({ params: { id: "abc" } });
    const res = buildRes();

    await assign_payment_to_walker(req, res);

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

    await assign_payment_to_walker(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg: "Pago no encontrado",
    });
  });

  // 3. Usuario no admin (403)
  test("retorna 403 si el usuario no es admin", async () => {
    const req = buildReq({ user: { role_id: 2, user_id: 2 } }); // paseador
    const res = buildRes();

    await assign_payment_to_walker(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg: "Solo los administradores pueden asignar pagos",
    });
  });

  // 4. Pago no confirmado (400)
  test("retorna 400 si el pago no está confirmado", async () => {
    const unpaidPayment = { ...mockPayment, status: "pendiente" };
    payment.findByPk.mockResolvedValue(unpaidPayment);
    const req = buildReq();
    const res = buildRes();

    await assign_payment_to_walker(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg: "Solo se pueden asignar pagos con estado 'pagado'",
    });
  });

  // 5. Pago ya asignado (400)
  test("retorna 400 si el pago ya fue asignado", async () => {
    const assignedPayment = { ...mockPayment, walker_assigned: true };
    payment.findByPk.mockResolvedValue(assignedPayment);
    const req = buildReq();
    const res = buildRes();

    await assign_payment_to_walker(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg: "Este pago ya ha sido asignado al paseador",
    });
  });

  // 6. Paseador no asignado (400)
  test("retorna 400 si no hay paseador asignado al paseo", async () => {
    const paymentWithoutWalker = {
      ...mockPayment,
      walk: { ...mockPayment.walk, walker: null },
    };
    payment.findByPk.mockResolvedValue(paymentWithoutWalker);
    const req = buildReq();
    const res = buildRes();

    await assign_payment_to_walker(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg: "No hay un paseador asignado a este paseo",
    });
  });

  // 7. Asignación exitosa (200)
  test("retorna 200 cuando la asignación es exitosa", async () => {
    const req = buildReq();
    const res = buildRes();

    await assign_payment_to_walker(req, res);

    // Verificar actualización del pago
    expect(mockPayment.update).toHaveBeenCalledWith({
      walker_assigned: true,
      walker_amount: 9000, // 10000 - 10% comisión
      commission_amount: 1000, // 10% de 10000
      assignment_date: expect.any(Date),
    });

    // Verificar notificación al paseador
    expect(send_payment_notification_to_walker).toHaveBeenCalledWith({
      walker_email: "paseador@example.com",
      walker_name: "Ana Paseador",
      payment_id: 1,
      walk_id: 1,
      walker_amount: 9000,
      commission_amount: 1000,
      total_amount: 10000,
      assignment_date: expect.any(Date),
      client_name: "Juan Cliente",
      walk_date: "2023-01-01",
      walk_duration: 60,
      walk_comments: "Paseo normal",
      walk_type: "Paseo Fijo",
    });

    // Verificar actualización del balance del paseador
    expect(walker_profile.findByPk).toHaveBeenCalledWith(2);
    expect(mockWalkerProfile.update).toHaveBeenCalledWith({
      balance: 14000, // 5000 (balance inicial) + 9000
    });

    // Verificar creación del registro de pago al paseador
    expect(payment.create).toHaveBeenCalledWith({
      user_id: 2,
      amount: 9000,
      status: "pagado",
      walk_id: 1,
      description: "Pago por caminata 1 asignado al paseador",
    });

    expect(res.json).toHaveBeenCalledWith({
      msg: "Pago asignado exitosamente al paseador",
      error: false,
      data: expect.objectContaining({
        walker_id: 2,
        walker_name: "Ana Paseador",
        total_amount: 10000,
        commission_amount: 1000,
        walker_amount: 9000,
      }),
    });
  });

  // 8. Error al notificar paseador (500)
  test("retorna 500 con warning si falla la notificación al paseador", async () => {
    send_payment_notification_to_walker.mockRejectedValue(
      new Error("Email error")
    );
    const req = buildReq();
    const res = buildRes();

    await assign_payment_to_walker(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Pago asignado, pero error al notificar al paseador",
      error: true,
      warning: true,
    });
  });

  // 9. Perfil de paseador no encontrado (404)
  test("retorna 404 si no se encuentra el perfil del paseador", async () => {
    walker_profile.findByPk.mockResolvedValue(null);
    const req = buildReq();
    const res = buildRes();

    await assign_payment_to_walker(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg: "Perfil de paseador no encontrado",
    });
  });

  // 10. Error interno del servidor (500)
  test("retorna 500 cuando ocurre un error inesperado", async () => {
    const originalConsole = console.error;
    console.error = jest.fn();

    payment.findByPk.mockRejectedValue(new Error("Database error"));
    const req = buildReq();
    const res = buildRes();

    await assign_payment_to_walker(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Error interno al asignar el pago",
      error: true,
      debug: undefined, // En producción no se muestra el debug
    });

    console.error = originalConsole;
  });

  // 11. Modo desarrollo muestra debug info
  test("en desarrollo muestra información de debug en errores", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const error = new Error("Test error");
    payment.findByPk.mockRejectedValue(error);
    const req = buildReq();
    const res = buildRes();

    await assign_payment_to_walker(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        debug: error.message,
      })
    );

    process.env.NODE_ENV = originalEnv;
  });
});
