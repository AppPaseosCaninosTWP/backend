/**
 * @file pet_controller.js
 * @module mod1 - Gestión de Usuarios
 * @description Pruebas unitarias para la función `get_pets`
 *
 * Casos de prueba cubiertos:
 * 1. Usuario no autorizado para ver mascotas (403)
 * 2. Cliente ve solo sus mascotas (200)
 * 3. Admin ve mascotas de un owner específico (200)
 * 4. Admin ve todas las mascotas (200)
 * 5. Error interno del servidor (500)
 *
 * Basado en: ERS v2.7 – Requerimiento CRED-005
 */

const { get_pets } = require("../../../../controllers/pet_controller");
const { pet } = require("../../../../models/database");

jest.mock("../../../../models/database", () => ({
  pet: {
    findAndCountAll: jest.fn(),
  },
}));

describe("get_pets", () => {
  const build_mock_response = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const build_mock_request = (role_id, user_id, query = {}) => ({
    user: { role_id, user_id },
    query,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Usuario no autorizado para ver mascotas (403)
  test("retorna 403 si el rol no es admin ni cliente", async () => {
    const req = build_mock_request(2, 5); // paseador
    const res = build_mock_response();

    await get_pets(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: true }));
  });

  // 2. Cliente ve solo sus mascotas (200)
  test("cliente ve solo sus mascotas (owner_id se ignora)", async () => {
    pet.findAndCountAll.mockResolvedValue({ count: 1, rows: [{ name: "Luna" }] });

    const req = build_mock_request(3, 7, { owner_id: "999" });
    const res = build_mock_response();

    await get_pets(req, res);

    expect(pet.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { owner_id: 7 },
    }));

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: false }));
  });

  // 3. Admin ve mascotas de un owner específico (200)
  test("admin ve mascotas de un owner específico", async () => {
    pet.findAndCountAll.mockResolvedValue({ count: 2, rows: [{}, {}] });

    const req = build_mock_request(1, 99, { owner_id: "3" });
    const res = build_mock_response();

    await get_pets(req, res);

    expect(pet.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { owner_id: 3 },
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 2 }));
  });

  // 4. Admin ve todas las mascotas (200)
  test("admin ve todas las mascotas (sin filtro)", async () => {
    pet.findAndCountAll.mockResolvedValue({ count: 3, rows: [{}, {}, {}] });

    const req = build_mock_request(1, 99); // sin owner_id
    const res = build_mock_response();

    await get_pets(req, res);

    expect(pet.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: {},
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 3 }));
  });

  // 5. Error interno del servidor (500)
  test("retorna 500 si ocurre un error inesperado", async () => {
    const original_console_error = console.error;
    console.error = jest.fn(); // Silenciar temporalmente

    pet.findAndCountAll.mockRejectedValue(new Error("DB fail"));

    const req = build_mock_request(3, 1);
    const res = build_mock_response();

    await get_pets(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: true }));

    console.error = original_console_error; // Restaurar
  });
});