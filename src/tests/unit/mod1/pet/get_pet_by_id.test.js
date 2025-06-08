/**
 * @file pet_controller.js
 * @module mod1 - Gestión de Usuarios
 * @description Pruebas unitarias para la función `get_pet_by_id`
 *
 * Casos de prueba cubiertos:
 * 1. Mascota no encontrada (404)
 * 2. Retorno exitoso con datos de mascota (200)
 * 3. Error interno del servidor (500)
 *
 * Basado en: ERS v2.7 – Requerimiento CRED-005
 */

const { get_pet_by_id } = require("../../../../controllers/pet_controller");
const { pet } = require("../../../../models/database");

jest.mock("../../../../models/database", () => ({
  pet: { findOne: jest.fn() }
}));

describe("get_pet_by_id", () => {
  const build_mock_response = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const build_mock_request = (params = {}, role_id = 3, user_id = 1) => ({
    params,
    user: { user_id, role_id }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Mascota no encontrada (404)
  test("retorna 404 si la mascota no existe", async () => {
    pet.findOne.mockResolvedValue(null);

    const req = build_mock_request({ id: "10" });
    const res = build_mock_response();

    await get_pet_by_id(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      msg: "mascota no encontrada",
      error: true
    });
  });

  // 2. Retorno exitoso con datos de mascota (200)
  test("retorna 200 si la mascota es encontrada", async () => {
    const pet_data = { pet_id: 10, name: "Max" };
    pet.findOne.mockResolvedValue(pet_data);

    const req = build_mock_request({ id: "10" });
    const res = build_mock_response();

    await get_pet_by_id(req, res);

    expect(res.status).not.toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      msg: "mascota encontrada exitosamente",
      data: pet_data,
      error: false
    });
  });

  // 3. Error interno del servidor (500)
  test("retorna 500 si ocurre un error inesperado", async () => {
    const original_console_error = console.error;
    console.error = jest.fn(); // Silenciar temporalmente

    pet.findOne.mockRejectedValue(new Error("DB error"));

    const req = build_mock_request({ id: "10" });
    const res = build_mock_response();

    await get_pet_by_id(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg: "error en el servidor",
      error: true
    });

    console.error = original_console_error; // Restaurar
  });
});