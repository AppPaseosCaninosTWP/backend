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

// 1. Primero configuramos todos los mocks necesarios
const mockPaymentModel = {
  findByPk: jest.fn(),
  create: jest.fn(),
};

const mockWalkerProfileModel = {
  findByPk: jest.fn(),
  update: jest.fn(),
};

const mockEmailService = {
  send_payment_notification_to_walker: jest.fn(),
};

// 2. Mockeamos los módulos necesarios
jest.mock("../../../../models/database", () => ({
  payment: mockPaymentModel,
  walker_profile: mockWalkerProfileModel,
}));

jest.mock(
  "../../../../utils/email/mail_service_payment",
  () => mockEmailService
);

// 3. Finalmente importamos el controlador a probar
const {
  assign_payment_to_walker,
} = require("../../../../controllers/payment_controller");

describe("assign_payment_to_walker", () => {
  const buildReq = (overrides = {}) => ({
    params: { id: "1", ...overrides.params },
    user: { role_id: 1, user_id: 1, ...overrides.user }, // admin por defecto
  });

  const buildRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  });

  const mockPayment = {
    payment_id: 1,
    amount: 10000,
    status: "pagado",
    walker_assigned: false,
    walk_id: 1,
    update: jest.fn().mockResolvedValue(true),
    walk: {
      walk_id: 1,
      client_id: 1,
      walker_id: 2,
      comments: "Comentarios de prueba",
      walk_type: { name: "Paseo estándar" },
      walker: {
        user_id: 2,
        email: "paseador@example.com",
        name: "Ana Paseador",
      },
      client: {
        user_id: 1,
        name: "Cliente Ejemplo",
        email: "cliente@example.com",
      },
      days: [
        {
          start_date: "2023-01-01",
          duration: 30,
        },
      ],
    },
  };

  const mockWalkerProfile = {
    walker_id: 2,
    balance: 5000,
    update: jest.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Configuración base del mock para payment.findByPk
    mockPaymentModel.findByPk.mockImplementation(async (id, options) => {
      if (id === "1") {
        if (options?.include) {
          return {
            ...mockPayment,
            walk: {
              ...mockPayment.walk,
              walk_type: { name: "Paseo estándar" },
              days: [{ start_date: "2023-01-01", duration: 30 }],
            },
          };
        }
        return { ...mockPayment, walk: undefined };
      }
      return null;
    });

    // Mock para walker_profile.findByPk
    mockWalkerProfileModel.findByPk.mockImplementation(async (id) => {
      if (id === 2) {
        return mockWalkerProfile;
      }
      return null;
    });

    mockEmailService.send_payment_notification_to_walker.mockResolvedValue(
      true
    );
    mockPaymentModel.create.mockResolvedValue({});
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
    mockPaymentModel.findByPk.mockResolvedValue(null);
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
    mockPaymentModel.findByPk.mockResolvedValue({
      ...mockPayment,
      status: "pendiente",
    });
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
    mockPaymentModel.findByPk.mockResolvedValue({
      ...mockPayment,
      walker_assigned: true,
    });
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
    mockPaymentModel.findByPk.mockResolvedValue({
      ...mockPayment,
      walk: { ...mockPayment.walk, walker: null },
    });
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

    expect(mockPaymentModel.findByPk).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({
        include: expect.anything(),
      })
    );
    expect(mockWalkerProfileModel.findByPk).toHaveBeenCalledWith(2);
    expect(
      mockEmailService.send_payment_notification_to_walker
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        walker_email: "paseador@example.com",
        walker_name: "Ana Paseador",
        payment_id: 1,
        walk_id: 1,
      })
    );
    expect(res.json).toHaveBeenCalledWith({
      msg: "Pago asignado exitosamente al paseador",
      error: false,
      data: expect.objectContaining({
        walker_id: 2,
        walker_name: "Ana Paseador",
      }),
    });
  });

  // 8. Error al notificar paseador (500)
  test("retorna 500 si falla la notificación al paseador", async () => {
    mockEmailService.send_payment_notification_to_walker.mockRejectedValue(
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
    // Configura el mock para que no encuentre el perfil solo en esta prueba
    mockWalkerProfileModel.findByPk.mockResolvedValueOnce(null);

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

    mockPaymentModel.findByPk.mockRejectedValue(new Error("Database error"));
    const req = buildReq();
    const res = buildRes();

    await assign_payment_to_walker(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Error interno al asignar el pago",
      error: true,
      debug: undefined,
    });

    console.error = originalConsole;
  });
});
