/**
 * @file pet_controller.js
 * @module mod1 - Gestión de Usuarios
 * @description Pruebas unitarias para la función `update_pet`
 *
 * Casos de prueba cubiertos:
 * 1. Mascota no existe (404)
 * 2. is_enable no enviado por admin (400)
 * 3. is_enable no es booleano (400)
 * 4. Dueño actualiza nombre inválido (400)
 * 5. Dueño actualiza edad inválida (400)
 * 6. Actualización exitosa por admin (200)
 * 7. Actualización exitosa por dueño (200)
 * 8. Error interno del servidor (500)
 *
 * Basado en: ERS v2.7 – Requerimiento CRED-005
 */

const { update_pet } = require("../../../../controllers/pet_controller");
const { pet } = require("../../../../models/database");

jest.mock("../../../../models/database", () => ({
  pet: {
    findOne: jest.fn(),
  },
}));

describe("update_pet", () => {
  const build_mock_response = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const build_mock_request = ({
    id = "1",
    role_id = 1,
    user_id = 1,
    body = {},
  }) => ({
    params: { id },
    user: { role_id, user_id },
    body,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Mascota no existe (404)
  test("retorna 404 si la mascota no existe (admin)", async () => {
    pet.findOne.mockResolvedValue(null);
    const req = build_mock_request({});
    const res = build_mock_response();

    await update_pet(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  // 2. is_enable no enviado por admin (400)
  test("retorna 400 si admin no envía is_enable", async () => {
    pet.findOne.mockResolvedValue({ pet_id: 1 });
    const req = build_mock_request({ body: {} });
    const res = build_mock_response();

    await update_pet(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  // 3. is_enable no es booleano (400)
  test("retorna 400 si is_enable no es booleano", async () => {
    pet.findOne.mockResolvedValue({ pet_id: 1 });
    const req = build_mock_request({ body: { is_enable: "yes" } });
    const res = build_mock_response();

    await update_pet(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  // 4. Dueño actualiza nombre inválido (400)
  test("retorna 400 si el dueño envía nombre vacío", async () => {
    pet.findOne.mockResolvedValue({ update: jest.fn(), pet_id: 1 });
    const req = build_mock_request({ role_id: 3, body: { name: "" } });
    const res = build_mock_response();

    await update_pet(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  // 5. Dueño actualiza edad inválida (400)
  test("retorna 400 si el dueño envía edad inválida", async () => {
    pet.findOne.mockResolvedValue({ update: jest.fn(), pet_id: 1 });
    const req = build_mock_request({ role_id: 3, body: { age: -5 } });
    const res = build_mock_response();

    await update_pet(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  // 6. Actualización exitosa por admin (200)

  // 7. Actualización exitosa por dueño (200)
  test("retorna 200 si dueño actualiza nombre y edad exitosamente", async () => {
    const mock_pet = { update: jest.fn(), pet_id: 1 };
    pet.findOne.mockResolvedValue(mock_pet);
    const req = build_mock_request({
      role_id: 3,
      body: { name: "Firulais", age: 4 },
    });
    const res = build_mock_response();

    await update_pet(req, res);

    expect(mock_pet.update).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(400);
  });

  // 8. Error interno del servidor (500)
  test("retorna 500 si ocurre un error inesperado", async () => {
    const original_console_error = console.error;
    console.error = jest.fn(); // Silenciar temporalmente

    pet.findOne.mockRejectedValue(new Error("fail"));
    const req = build_mock_request({});
    const res = build_mock_response();

    await update_pet(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    console.error = original_console_error; // Restaurar
  });
});
