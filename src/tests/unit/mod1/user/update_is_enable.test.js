/**
 * @file user_controller.js
 * @module mod1 - Gestión de Usuarios
 * @description Pruebas unitarias para la función `update_is_enable`
 *
 * Casos de prueba cubiertos:
 * 1. Usuario no encontrado (404)
 * 2. Cambio de estado exitoso (200)
 * 3. Error interno del servidor (500)
 *
 * Basado en: ERS v2.7 - Requerimiento CRED-009
 */

const { update_is_enable } = require("../../../../controllers/user_controller");
const { user } = require("../../../../models/database");

jest.mock("../../../../models/database", () => ({
  user: { findByPk: jest.fn() },
}));

describe("update_is_enable", () => {
  const buildReq = ({ roleId = 1, id = "5", is_enable = "true" } = {}) => ({
    user: { role_id: roleId },
    params: { id },
    body: { is_enable },
  });

  const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("1. Usuario no encontrado (404)", async () => {
    user.findByPk.mockResolvedValue(null);

    const req = buildReq({ id: "99", is_enable: "true" });
    const res = buildRes();

    await update_is_enable(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Usuario no encontrado",
      error: true,
    });
  });

  test("2. Cambio de estado exitoso (200)", async () => {
    // Simulamos un user habilitado previamente en false y rol válido (2 o 3)
    const found = {
      user_id:   7,
      role_id:   2,
      is_enable: false,
      save:      jest.fn().mockResolvedValue(),
    };
    user.findByPk.mockResolvedValue(found);

    // Deshabilitar al pasar "0"
    const req = buildReq({ id: "7", is_enable: "0" });
    const res = buildRes();

    await update_is_enable(req, res);

    // Como no hay .status(200), sólo comprobamos el payload
    expect(res.json).toHaveBeenCalledWith({
      msg: "Usuario deshabilitado correctamente",
      data: { user_id: 7, is_enable: false },
      error: false,
    });
    // Y que haya llamado a save() para persistir
    expect(found.save).toHaveBeenCalled();
  });

  test("3. Error interno del servidor (500)", async () => {
    // Opcionalmente, silenciar console.error:
    const origErr = console.error;
    console.error = jest.fn();

    user.findByPk.mockRejectedValue(new Error("DB falló"));

    const req = buildReq();
    const res = buildRes();

    await update_is_enable(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Error en el servidor",
      error: true,
    });

    // Restaurar si lo silenciaste:
    console.error = origErr;
  });
});
