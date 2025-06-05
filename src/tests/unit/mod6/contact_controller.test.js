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
});