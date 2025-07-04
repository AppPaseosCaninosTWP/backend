/**
 * @file walker_profile_controller.js
 * @module mod1 - Gestión de Usuarios
 * @description Pruebas unitarias para la función `get_all_profiles`
 *
 * Casos de prueba cubiertos:
 * 1. Retorno exitoso de perfiles (200)
 * 2. Lista vacía (200 con array vacío)
 * 3. Error interno del servidor (500)
 *
 * Basado en: ERS v2.7 – Requerimiento CRED-008
 */

const { get_all_profiles } = require("../../../../controllers/walker_profile_controller");
const { walker_profile } = require("../../../../models/database");

jest.mock("../../../../models/database", () => ({
  walker_profile: { findAndCountAll: jest.fn() },
}));

describe("get_all_profiles", () => {
  const buildReq = ({ page, limit, host = "localhost", protocol = "http" } = {}) => ({
    query: { ...(page != null && { page: String(page) }), ...(limit != null && { limit: String(limit) }) },
    protocol,
    get: () => host,
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

  test("1. Retorno exitoso de perfiles (200)", async () => {
    const rows = [
      {
        walker_id: 1,
        user:      { name: "Ana", email: "ana@twp.com", phone: "911111111" },
        experience: 3,
        walker_type: "Fijo",
        zone:        "Norte",
        description: "Muy responsable",
        balance:     1500,
        on_review:   false,
        photo:       "ana.jpg",
      },
      {
        walker_id: 2,
        user:      { name: "Luis", email: "luis@twp.com", phone: "922222222" },
        experience: 2,
        walker_type: "Sporádico",
        zone:        "Sur",
        description: "Ama los perros",
        balance:     800,
        on_review:   true,
        photo:       "luis.png",
      },
    ];
    walker_profile.findAndCountAll.mockResolvedValue({ count: 2, rows });

    const req = buildReq({ page: 2, limit: 5 });
    const res = buildRes();

    await get_all_profiles(req, res);

    expect(res.json).toHaveBeenCalledWith({
      msg: "Perfiles obtenidos exitosamente",
      data: [
        {
          walker_id:  1,
          name:       "Ana",
          email:      "ana@twp.com",
          phone:      "911111111",
          experience: 3,
          walker_type: "Fijo",
          zone:        "Norte",
          description: "Muy responsable",
          balance:     1500,
          on_review:   false,
          photo:       "ana.jpg",
          photoUrl:    "http://localhost/uploads/ana.jpg",
        },
        {
          walker_id:  2,
          name:       "Luis",
          email:      "luis@twp.com",
          phone:      "922222222",
          experience: 2,
          walker_type: "Sporádico",
          zone:        "Sur",
          description: "Ama los perros",
          balance:     800,
          on_review:   true,
          photo:       "luis.png",
          photoUrl:    "http://localhost/uploads/luis.png",
        },
      ],
      pagination: {
        total:       2,
        page:        2,
        per_page:    5,
        total_pages: Math.ceil(2 / 5),
      },
      error: false,
    });
  });

  test("2. Lista vacía (200 con array vacío)", async () => {
    walker_profile.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const req = buildReq();         // usa page=1, limit=10 por defecto
    const res = buildRes();

    await get_all_profiles(req, res);

    expect(res.json).toHaveBeenCalledWith({
      msg: "Perfiles obtenidos exitosamente",
      data: [],
      pagination: {
        total:       0,
        page:        1,
        per_page:    10,
        total_pages: Math.ceil(0 / 10),
      },
      error: false,
    });
  });

  test("3. Error interno del servidor (500)", async () => {
    // Silenciar el error log
    const originalConsole = console.error;
    console.error = jest.fn();

    walker_profile.findAndCountAll.mockRejectedValue(new Error("DB fail"));

    const req = buildReq();
    const res = buildRes();

    await get_all_profiles(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg: "error en el servidor",
      error: true,
    });

    // Restaurar
    console.error = originalConsole;
  });
});
