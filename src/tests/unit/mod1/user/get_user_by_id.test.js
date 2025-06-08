/**
 * @file user_controller.js
 * @module mod1 - Gestión de Usuarios
 * @description Pruebas unitarias para la función `get_user_by_id`
 *
 * Casos de prueba cubiertos:
 * 1. ID inválido o no encontrado (404)
 * 2. Usuario encontrado correctamente (200)
 * 3. Error interno del servidor (500)
 *
 * Basado en: ERS v2.7 - Requerimiento CRED-009
 */

const { get_user_by_id } = require("../../../../controllers/user_controller");
const { user } = require("../../../../models/database");

jest.mock("../../../../models/database", () => ({
  user: { findByPk: jest.fn() },
}));

describe("get_user_by_id", () => {
  const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
  };

  const buildReq = (id) => ({ params: { id } });

  beforeEach(() => jest.clearAllMocks());

    // 1. ID inválido o no encontrado (404)
  test("retorna 404 si el ID es inválido o no se encuentra el usuario", async () => {
    user.findByPk.mockResolvedValue(null);

    const req = buildReq("999");
    const res = buildRes();

    await get_user_by_id(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      msg: "usuario no encontrado",
      error: true,
    });
  });

    // 2. Usuario encontrado correctamente (200)
  test("retorna 200 con los datos del usuario si se encuentra correctamente", async () => {
    const mockUser = {
      user_id:   5,
      name:      "Carlos Walker",
      email:     "carlos@twp.com",
      phone:     "922222222",
      is_enable: true,
      ticket:    1,
      role_id:   4,
      role:      { name: "Walker" },
    };
    user.findByPk.mockResolvedValue(mockUser);

    const req = buildReq("5");
    const res = buildRes();

    await get_user_by_id(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith({
      msg: "usuario encontrado exitosamente",
      data: [
        {
          user_id:   5,
          name:      "Carlos Walker",
          email:     "carlos@twp.com",
          phone:     "922222222",
          is_enable: true,
          ticket:    1,
          role_id:   4,
          role_name: "Walker",
        }
      ],
      error: false,
    });
  });

    // 3. Error interno del servidor (500)
  test("retorna 500 si ocurre un error inesperado", async () => {
    // Opcionalmente, silenciar console.error:
    const origErr = console.error;
    console.error = jest.fn();

    user.findByPk.mockRejectedValue(new Error("DB crash"));

    const req = buildReq("1");
    const res = buildRes();

    await get_user_by_id(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg: "error en el servidor",
      error: true,
    });

    // Restaurar si lo silenciaste:
    console.error = origErr;
  });
});
