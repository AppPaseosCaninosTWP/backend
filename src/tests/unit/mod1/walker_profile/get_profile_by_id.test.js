/**
 * @file walker_profile_controller.js
 * @module mod1 - Gestión de Usuarios
 * @description Pruebas unitarias para la función `get_profile_by_id`
 *
 * Casos de prueba cubiertos:
 * 1. ID inválido o inexistente (404)
 * 2. Perfil encontrado correctamente (200)
 * 3. Error interno del servidor (500)
 *
 * Basado en: ERS v2.7 – Requerimiento CRED-008
 */

const { get_profile_by_id } = require("../../../../controllers/walker_profile_controller");
const { walker_profile } = require("../../../../models/database");

jest.mock("../../../../models/database", () => ({
  walker_profile: { findByPk: jest.fn() },
  user: {}, // dummy, sólo para la include
}));

describe("get_profile_by_id", () => {
  const buildReq = ({ id = "7", roleId = 1, userId = 7, host = "localhost", protocol = "http" } = {}) => ({
    params: { id },
    user:   { role_id: roleId, user_id: userId },
    protocol,
    get:     () => host,
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

  test("1. ID inválido o inexistente (404)", async () => {
    walker_profile.findByPk.mockResolvedValue(null);

    const req = buildReq({ id: "99" });
    const res = buildRes();

    await get_profile_by_id(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Perfil no encontrado",
      error: true,
    });
  });

  test("2. Perfil encontrado correctamente (200)", async () => {
    const mockProfile = {
      walker_id:   7,
      user:        { name: "Test Walker", email: "test@twp.com", phone: "900900900" },
      experience:  5,
      walker_type: "Fijo",
      zone:        "Norte",
      photo:       "foto.jpg",
      description: "Muy bueno",
      balance:     1200,
      on_review:   false,
    };
    walker_profile.findByPk.mockResolvedValue(mockProfile);

    // Simulamos admin (role_id=1)
    const req = buildReq({ id: "7", roleId: 1, userId: 999, host: "api.host.com", protocol: "https" });
    const res = buildRes();

    await get_profile_by_id(req, res);

    expect(res.json).toHaveBeenCalledWith({
      msg: "Perfil encontrado exitosamente",
      data: {
        walker_id:   7,
        name:        "Test Walker",
        email:       "test@twp.com",
        phone:       "900900900",
        experience:  5,
        walker_type: "Fijo",
        zone:        "Norte",
        photo:       "foto.jpg",
        photo_url:   "https://api.host.com/api/uploads/foto.jpg",
        description: "Muy bueno",
        balance:     1200,
        on_review:   false,
      },
      error: false,
    });
  });

  test("3. Error interno del servidor (500)", async () => {
    // silenciar console.error sólo para este test
    const originalConsole = console.error;
    console.error = jest.fn();

    walker_profile.findByPk.mockRejectedValue(new Error("DB crash"));

    const req = buildReq();
    const res = buildRes();

    await get_profile_by_id(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Error en el servidor",
      error: true,
    });

    console.error = originalConsole;
  });
});
