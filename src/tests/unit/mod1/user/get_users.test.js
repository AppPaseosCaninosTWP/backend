/**
 * @file user_controller.js
 * @module mod1 - Gestión de Usuarios
 * @description Pruebas unitarias para la función `get_users`
 *
 * Casos de prueba cubiertos:
 * 1. Listado vacío (200 con array vacío)
 * 2. Listado exitoso de usuarios (200 con datos)
 * 3. Error interno del servidor (500)
 *
 * Basado en: ERS v2.7 - Requerimiento CRED-008
 */

const { get_users } = require("../../../../controllers/user_controller");
const { user } = require("../../../../models/database");

jest.mock("../../../../models/database", () => ({
  user: { findAndCountAll: jest.fn() },
}));

describe("get_users", () => {
  const buildReq = (query) => ({ query });
  const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("1. Listado vacío (200 con array vacío)", async () => {
    user.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const req = buildReq({ page: "1", limit: "10" });
    const res = buildRes();

    await get_users(req, res);

    expect(res.json).toHaveBeenCalledWith({
      msg: "usuarios obtenidos exitosamente",
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      error: false,
    });
  });

  test("2. Listado exitoso de usuarios (200 con datos)", async () => {
    const mockRows = [
      {
        user_id:   1,
        name:      "Ana Walker",
        email:     "ana@twp.com",
        phone:     "911111111",
        is_enable: true,
        ticket:    false,
        role_id:   2,
        role:      { name: "walker" },
      },
      {
        user_id:   4,
        name:      "Pedro Cliente",
        email:     "pedro@twp.com",
        phone:     "944444444",
        is_enable: true,
        ticket:    true,
        role_id:   3,
        role:      { name: "client" },
      },
    ];
    user.findAndCountAll.mockResolvedValue({ count: 2, rows: mockRows });

    const req = buildReq({ page: "2", limit: "5" });
    const res = buildRes();

    await get_users(req, res);

    expect(res.json).toHaveBeenCalledWith({
      msg: "usuarios obtenidos exitosamente",
      data: [
        {
          user_id:   1,
          name:      "Ana Walker",
          email:     "ana@twp.com",
          phone:     "911111111",
          is_enable: true,
          ticket:    false,
          role_id:   2,
          role_name: "walker",
        },
        {
          user_id:   4,
          name:      "Pedro Cliente",
          email:     "pedro@twp.com",
          phone:     "944444444",
          is_enable: true,
          ticket:    true,
          role_id:   3,
          role_name: "client",
        },
      ],
      total: 2,
      page: 2,
      limit: 5,
      error: false,
    });
  });

  test("3. Error interno del servidor (500)", async () => {
    user.findAndCountAll.mockRejectedValue(new Error("DB crash"));

    const req = buildReq({});
    const res = buildRes();

    await get_users(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Error en el servidor",
      error: true,
    });
  });
});