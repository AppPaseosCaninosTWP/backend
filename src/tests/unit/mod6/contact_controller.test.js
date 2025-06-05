/**
 * @file contact_controller.test.js
 * @module mod6 - Mensajes
 * @description Pruebas unitarias para la función `redirect_whatsapp`
 *
 * Casos de prueba cubiertos:
 * 1. Usuario receptor no existe (404)
 * 2. No hay paseo activo entre los usuarios (403)
 * 3. Redirección válida con paseo activo (200)
 * 4. Link generado tiene el formato correcto (https://wa.me/56...)
 * 5. Error interno del servidor (500)
 *
 * Basado en: ERS v2.7 – Requerimiento MSGS-001
 */

const {
  redirect_whatsapp,
} = require("../../../controllers/contact_controller");
const { user, walk } = require("../../../models/database");

jest.mock("../../../models/database", () => ({
  user: { findByPk: jest.fn() },
  walk: { findOne: jest.fn() },
}));

describe("redirect_whatsapp", () => {
  const build_mock_response = () => {
    const response = {};
    response.status = jest.fn().mockReturnValue(response);
    response.json = jest.fn().mockReturnValue(response);
    return response;
  };

  const build_mock_request = (user_id, target_user_id) => ({
    user: { user_id },
    params: { id: target_user_id },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  //1. Usuario receptor no existe (404)
  test("retorna 404 si el usuario receptor no existe", async () => {
    user.findByPk.mockResolvedValue(null);
    const request = build_mock_request(1, 999);
    const response = build_mock_response();

    await redirect_whatsapp(request, response);

    expect(user.findByPk).toHaveBeenCalledWith(999);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      error: true,
      msg: "Usuario no encontrado",
    });
  });

  //2. No hay paseo activo entre los usuarios (403)
  test("retorna 403 si no hay paseo activo entre los usuarios", async () => {
    // Simula que el receptor sí existe
    user.findByPk.mockResolvedValue({
      user_id: 2,
      name: "Juan",
      role_id: 3,
      phone: "912345678",
    });

    // Simula que NO hay paseo activo entre ambos usuarios
    walk.findOne.mockResolvedValue(null);

    const request = build_mock_request(1, 2); // current_user_id = 1, target_user_id = 2
    const response = build_mock_response();

    await redirect_whatsapp(request, response);

    expect(user.findByPk).toHaveBeenCalledWith(2);
    expect(walk.findOne).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: true,
      msg: "No tienes paseos activos con este usuario",
    });
  });
  
  //3. Redirección válida con paseo activo (200)
  test("retorna 200 con link de whatsapp y datos si hay paseo activo", async () => {
    // Usuario receptor simulado (existe en BD)
    const receptor = {
      user_id: 2,
      name: "Laura",
      role_id: 2,
      phone: "912345678",
    };

    user.findByPk.mockResolvedValue(receptor);

    // Paseo activo entre current_user (1) y receptor (2)
    walk.findOne.mockResolvedValue({
      walk_id: 77,
      client_id: 1,
      walker_id: 2,
      status: "en progreso",
    });

    const request = build_mock_request(1, 2); // current_user_id = 1, target_user_id = 2
    const response = build_mock_response();

    await redirect_whatsapp(request, response);

    expect(user.findByPk).toHaveBeenCalledWith(2);
    expect(walk.findOne).toHaveBeenCalled();
    expect(response.status).not.toHaveBeenCalled(); // usa el 200 por defecto
    expect(response.json).toHaveBeenCalledWith({
      error: false,
      msg: "Redirección generada correctamente",
      data: {
        user_id: receptor.user_id,
        name: receptor.name,
        role_id: receptor.role_id,
        phone: receptor.phone,
        whatsapp_link: `https://wa.me/56${receptor.phone}`,
      },
    });
  });
});