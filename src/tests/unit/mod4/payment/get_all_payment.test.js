/**
 * @file payment_controller.test.js
 * @module mod1 - Gestión de Pagos
 * @description Pruebas unitarias para la función `get_all_payments`
 *
 * Casos de prueba cubiertos:
 * 1. Admin obtiene todos los pagos (200)
 * 2. Cliente obtiene solo sus pagos (200)
 * 3. Paseador obtiene solo sus pagos (200)
 * 4. Error interno del servidor (500)
 *
 */

const {
  get_all_payments,
} = require("../../../../controllers/payment_controller");
const { payment, walk, user } = require("../../../../models/database");

jest.mock("../../../../models/database", () => ({
  payment: {
    findAll: jest.fn(),
  },
  walk: {},
  user: {},
}));

describe("get_all_payments", () => {
  const buildReq = (overrides = {}) => ({
    user: { role_id: 1, user_id: 1, ...overrides.user }, // admin por defecto
  });

  const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const mockPayments = [
    {
      payment_id: 1,
      amount: 10000,
      status: "pagado",
      walk: {
        client: { email: "client1@example.com" },
        walker: { email: "walker1@example.com" },
      },
    },
    {
      payment_id: 2,
      amount: 5000,
      status: "pendiente",
      walk: {
        client: { email: "client2@example.com" },
        walker: { email: "walker2@example.com" },
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Admin obtiene todos los pagos (200)
  test("retorna todos los pagos cuando el usuario es admin", async () => {
    payment.findAll.mockResolvedValue(mockPayments);
    const req = buildReq({ user: { role_id: 1 } }); // admin
    const res = buildRes();

    await get_all_payments(req, res);

    expect(payment.findAll).toHaveBeenCalledWith({
      where: {},
      include: [
        {
          model: walk,
          as: "walk",
          include: [
            { model: user, as: "client", attributes: ["email"] },
            { model: user, as: "walker", attributes: ["email"] },
          ],
        },
      ],
    });
    expect(res.json).toHaveBeenCalledWith({
      msg: "Pagos obtenidos",
      data: mockPayments,
      error: false,
    });
  });

  // 2. Cliente obtiene solo sus pagos (200)
  test("retorna solo pagos del cliente cuando role_id es 3", async () => {
    payment.findAll.mockResolvedValue([mockPayments[0]]);
    const req = buildReq({ user: { role_id: 3, user_id: 5 } }); // cliente
    const res = buildRes();

    await get_all_payments(req, res);

    expect(payment.findAll).toHaveBeenCalledWith({
      where: { "$walk.client_id$": 5 },
      include: expect.any(Array),
    });
    expect(res.json).toHaveBeenCalledWith({
      msg: "Pagos obtenidos",
      data: [mockPayments[0]],
      error: false,
    });
  });

  // 3. Paseador obtiene solo sus pagos (200)
  test("retorna solo pagos del paseador cuando role_id es 2", async () => {
    payment.findAll.mockResolvedValue([mockPayments[1]]);
    const req = buildReq({ user: { role_id: 2, user_id: 10 } }); // paseador
    const res = buildRes();

    await get_all_payments(req, res);

    expect(payment.findAll).toHaveBeenCalledWith({
      where: { "$walk.walker_id$": 10 },
      include: expect.any(Array),
    });
    expect(res.json).toHaveBeenCalledWith({
      msg: "Pagos obtenidos",
      data: [mockPayments[1]],
      error: false,
    });
  });

  // 4. Error interno del servidor (500)
  test("retorna 500 si ocurre un error en la base de datos", async () => {
    const originalConsole = console.error;
    console.error = jest.fn();

    payment.findAll.mockRejectedValue(new Error("Database connection failed"));
    const req = buildReq();
    const res = buildRes();

    await get_all_payments(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Error al obtener los pagos",
      error: true,
    });
    expect(console.error).toHaveBeenCalledWith(
      "Error en get_all_payments:",
      expect.any(Error)
    );

    console.error = originalConsole;
  });

  // 5. Caso borde: usuario con rol desconocido
  test("retorna pagos vacíos para rol desconocido", async () => {
    payment.findAll.mockResolvedValue([]);
    const req = buildReq({ user: { role_id: 99, user_id: 1 } }); // rol desconocido
    const res = buildRes();

    await get_all_payments(req, res);

    expect(payment.findAll).toHaveBeenCalledWith({
      where: {}, // condición vacía para rol desconocido
      include: expect.any(Array),
    });
    expect(res.json).toHaveBeenCalledWith({
      msg: "Pagos obtenidos",
      data: [],
      error: false,
    });
  });
});
