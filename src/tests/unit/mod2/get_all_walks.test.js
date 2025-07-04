/**
 * @file walk_controller.js
 * @module mod2 - Gestión de Paseos
 * @description Pruebas unitarias para la función `get_all_walks`
 *
 * Casos de prueba cubiertos:
 * 1. Cliente obtiene solo sus paseos (role_id = 3)
 * 2. Paseador obtiene paseos asignados + pendientes en su zona (role_id = 2)
 * 3. Admin obtiene todos los paseos (role_id = 1)
 * 4. Paginación correcta
 * 5. Perfil de paseador no encontrado (404)
 * 6. Error interno del servidor (500)
 *
 */

const { get_all_walks } = require("../../../controllers/walk_controller");
const {
  walk,
  walker_profile,
  user,
  walk_type,
  days_walk,
  pet,
} = require("../../../models/database");
const { Op } = require("sequelize");

// Mock de todas las dependencias
jest.mock("../../../models/database", () => ({
  walk: {
    findAll: jest.fn(),
  },
  walker_profile: {
    findOne: jest.fn(),
  },
  user: {},
  walk_type: {},
  days_walk: {},
  pet: {},
}));

describe("get_all_walks", () => {
  const buildReq = (overrides = {}) => ({
    user: {
      user_id: 1,
      role_id: 3, // Cliente por defecto
      ...overrides.user,
    },
    query: {
      page: "1",
      limit: "10",
      ...overrides.query,
    },
  });

  const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  // Datos de prueba comunes
  const mockWalk = (id, status, walkerId, pets) => ({
    walk_id: id,
    status,
    walker_id: walkerId,
    walk_type: { name: "Fijo" },
    client: { email: `client${id}@test.com` },
    walker: walkerId ? { email: `walker${walkerId}@test.com` } : null,
    days: [{ start_date: "2023-01-01", start_time: "10:00", duration: 30 }],
    pets: pets || [
      { pet_id: 1, name: "Firulais", photo: "firulais.jpg", zone: "norte" },
    ],
    payment_status: "pendiente",
    is_rated: false,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Cliente obtiene solo sus paseos (role_id = 3)
  test("cliente solo ve sus propios paseos", async () => {
    const req = buildReq({ user: { role_id: 3, user_id: 100 } });
    const res = buildRes();

    // Mock de paseos del cliente
    const clientWalks = [
      mockWalk(1, "pendiente", null),
      mockWalk(2, "confirmado", 50),
    ];
    walk.findAll.mockResolvedValue(clientWalks);

    await get_all_walks(req, res);

    // Verificar que solo busca paseos del cliente
    expect(walk.findAll).toHaveBeenCalledWith({
      where: { client_id: 100 },
      include: expect.any(Array),
      order: [["walk_id", "DESC"]],
    });

    // Verificar respuesta
    expect(res.json).toHaveBeenCalledWith({
      msg: "Paseos obtenidos exitosamente",
      data: expect.any(Array),
      total: 2,
      page: 1,
      limit: 10,
      error: false,
    });
  });

  // 2. Paseador obtiene paseos asignados + pendientes en su zona (role_id = 2)
  test("paseador ve sus paseos y pendientes en su zona", async () => {
    const req = buildReq({
      user: {
        role_id: 2,
        user_id: 200,
      },
    });
    const res = buildRes();

    // Mock de perfil de paseador
    walker_profile.findOne.mockResolvedValue({
      walker_id: 200,
      zone: "norte",
    });

    // Mock de paseos crudos (incluye algunos que no debería ver)
    const rawWalks = [
      mockWalk(1, "pendiente", null, [
        // Pendiente en su zona
        { pet_id: 1, name: "Firulais", photo: "firulais.jpg", zone: "norte" },
      ]),
      mockWalk(2, "pendiente", null, [
        // Pendiente en otra zona
        { pet_id: 2, name: "Rex", photo: "rex.jpg", zone: "sur" },
      ]),
      mockWalk(3, "confirmado", 200), // Su paseo asignado
      mockWalk(4, "confirmado", 201), // Paseo de otro paseador
    ];
    walk.findAll.mockResolvedValue(rawWalks);

    await get_all_walks(req, res);

    // Verificar que se filtraron correctamente
    const responseData = res.json.mock.calls[0][0].data;
    expect(responseData.length).toBe(2); // Solo debe ver 2 paseos
    expect(responseData.some((w) => w.walk_id === 1)).toBe(true); // Pendiente en su zona
    expect(responseData.some((w) => w.walk_id === 3)).toBe(true); // Su paseo asignado
    expect(responseData.some((w) => w.walk_id === 2)).toBe(false); // No debería ver este
    expect(responseData.some((w) => w.walk_id === 4)).toBe(false); // No debería ver este
  });

  // 3. Admin obtiene todos los paseos (role_id = 1)
  test("admin ve todos los paseos sin filtros", async () => {
    const req = buildReq({ user: { role_id: 1, user_id: 300 } });
    const res = buildRes();

    // Mock de todos los paseos
    const allWalks = [
      mockWalk(1, "pendiente", null),
      mockWalk(2, "confirmado", 200),
      mockWalk(3, "finalizado", 201),
    ];
    walk.findAll.mockResolvedValue(allWalks);

    await get_all_walks(req, res);

    // Verificar que busca todos los paseos sin filtros
    expect(walk.findAll).toHaveBeenCalledWith({
      include: expect.any(Array),
      order: [["walk_id", "DESC"]],
    });

    // Verificar que devuelve todos
    expect(res.json.mock.calls[0][0].total).toBe(3);
  });

  // 4. Paginación correcta
  test("devuelve resultados paginados correctamente", async () => {
    const req = buildReq({
      query: {
        page: "2",
        limit: "2",
      },
    });
    const res = buildRes();

    // Mock de 5 paseos
    const allWalks = [
      mockWalk(1, "pendiente", null),
      mockWalk(2, "confirmado", 200),
      mockWalk(3, "finalizado", 201),
      mockWalk(4, "cancelado", null),
      mockWalk(5, "pendiente", null),
    ];
    walk.findAll.mockResolvedValue(allWalks);

    await get_all_walks(req, res);

    const response = res.json.mock.calls[0][0];
    expect(response.total).toBe(5);
    expect(response.page).toBe(2);
    expect(response.limit).toBe(2);
    expect(response.data.length).toBe(2); // Debería devolver 2 items (página 2)
    expect(response.data[0].walk_id).toBe(3); // Orden DESC, página 2
  });

  // 5. Perfil de paseador no encontrado (404)
  test("retorna 404 si paseador no tiene perfil", async () => {
    const req = buildReq({ user: { role_id: 2, user_id: 200 } });
    const res = buildRes();

    // Simular que no encuentra perfil
    walker_profile.findOne.mockResolvedValue(null);

    await get_all_walks(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Perfil de paseador no encontrado",
      error: true,
    });
  });

  // 6. Error interno del servidor (500)
  test("retorna 500 si ocurre un error inesperado", async () => {
    const originalConsole = console.error;
    console.error = jest.fn();

    const req = buildReq();
    const res = buildRes();

    // Simular error en la base de datos
    walk.findAll.mockRejectedValue(new Error("Error de base de datos"));

    await get_all_walks(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Error en el servidor",
      error: true,
    });

    console.error = originalConsole;
  });
});
