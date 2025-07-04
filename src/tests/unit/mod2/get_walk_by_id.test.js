/**
 * @file walk_controller.js
 * @module mod2 - Gestión de Paseos
 * @description Pruebas unitarias para la función `get_walk_by_id`
 *
 * Casos de prueba cubiertos:
 * 1. ID de paseo inválido (400)
 * 2. Paseo no encontrado (404)
 * 3. Cliente sin permisos (403)
 * 4. Paseador sin permisos (403)
 * 5. Admin accede a cualquier paseo (200)
 * 6. Cliente accede a su propio paseo (200)
 * 7. Paseador accede a paseo asignado (200)
 * 8. Paseador accede a paseo pendiente (200)
 * 9. Error interno del servidor (500)
 *
 */

// Corregir las rutas relativas
const { get_walk_by_id } = require("../../../controllers/walk_controller");
const { walk, walk_type, user, days_walk, pet_walk, pet } = require("../../../models/database");

// Mock de todas las dependencias
jest.mock("../../../models/database", () => ({
  walk: {
    findByPk: jest.fn(),
  },
  walk_type: {},
  user: {},
  days_walk: {},
  pet_walk: {
    findAll: jest.fn(),
  },
  pet: {},
}));

describe("get_walk_by_id", () => {
  const buildReq = (overrides = {}) => ({
    params: {
      id: "1",
      ...overrides.params,
    },
    user: {
      user_id: 1,
      role_id: 3, // Cliente por defecto
      ...overrides.user,
    },
  });

  const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  // Datos de prueba comunes
  const mockBasicWalk = (id, clientId, walkerId, status, walkTypeId) => ({
    walk_id: id,
    client_id: clientId,
    walker_id: walkerId,
    status,
    walk_type_id: walkTypeId,
    walk_type: { name: walkTypeId === 1 ? "Fijo" : "Esporádico" },
  });

  const mockFullWalk = (id, clientId, walkerId, status, walkTypeId) => ({
    walk_id: id,
    client_id: clientId,
    walker_id: walkerId,
    status,
    walk_type_id: walkTypeId,
    comments: "Comentarios de prueba",
    client: { user_id: clientId, email: `client${clientId}@test.com`, phone: "123456789" },
    walker: walkerId ? { user_id: walkerId, email: `walker${walkerId}@test.com`, phone: "987654321" } : null,
    walk_type: { walk_type_id: walkTypeId, name: walkTypeId === 1 ? "Fijo" : "Esporádico" },
    days: [
      { start_date: "2023-01-01", start_time: "10:00", duration: 30 },
    ],
  });

  const mockPetWalks = (walkId, petIds) => 
    petIds.map(petId => ({
      walk_id: walkId,
      pet: {
        pet_id: petId,
        name: `Mascota ${petId}`,
        photo: `pet${petId}.jpg`,
        zone: "norte",
      },
    }));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. ID de paseo inválido (400)
  test("retorna 400 si el ID no es válido", async () => {
    const req = buildReq({ params: { id: "abc" } });
    const res = buildRes();

    await get_walk_by_id(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      msg: "ID de paseo inválido",
      error: true,
    });
  });

  // 2. Paseo no encontrado (404)
  test("retorna 404 si el paseo no existe", async () => {
    const req = buildReq();
    const res = buildRes();
    
    walk.findByPk.mockResolvedValue(null);

    await get_walk_by_id(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Paseo no encontrado",
      error: true,
    });
  });

  // 3. Cliente sin permisos (403)
  test("retorna 403 si cliente intenta acceder a paseo de otro", async () => {
    const req = buildReq({ user: { user_id: 100, role_id: 3 } });
    const res = buildRes();
    
    // Paseo pertenece al cliente 200
    walk.findByPk.mockResolvedValueOnce(
      mockBasicWalk(1, 200, null, "pendiente", 1)
    );

    await get_walk_by_id(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      msg: "No tienes permiso para ver este paseo",
      error: true,
    });
  });

  // 4. Paseador sin permisos (403)
  test("retorna 403 si paseador intenta acceder a paseo no asignado", async () => {
    const req = buildReq({ user: { user_id: 100, role_id: 2 } });
    const res = buildRes();
    
    // Paseo asignado a otro paseador (200)
    walk.findByPk.mockResolvedValueOnce(
      mockBasicWalk(1, 300, 200, "confirmado", 1)
    );

    await get_walk_by_id(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      msg: "No tienes permiso para ver este paseo",
      error: true,
    });
  });

  // 5. Admin accede a cualquier paseo (200)
  test("admin puede acceder a cualquier paseo", async () => {
    const req = buildReq({ user: { user_id: 1, role_id: 1 } });
    const res = buildRes();
    
    // Mock de paseo básico
    walk.findByPk.mockResolvedValueOnce(
      mockBasicWalk(1, 200, 300, "finalizado", 2)
    );
    
    // Mock de paseo completo
    walk.findByPk.mockResolvedValueOnce(
      mockFullWalk(1, 200, 300, "finalizado", 2)
    );
    
    // Mock de mascotas
    pet_walk.findAll.mockResolvedValue(
      mockPetWalks(1, [1, 2])
    );

    await get_walk_by_id(req, res);

    expect(res.json).toHaveBeenCalledWith({
      msg: "Paseo obtenido exitosamente",
      data: expect.objectContaining({
        walk_id: 1,
        client: expect.any(Object),
        walker: expect.any(Object),
        pets: expect.any(Array),
      }),
      error: false,
    });
  });

  // 6. Cliente accede a su propio paseo (200)
  test("cliente puede acceder a su propio paseo", async () => {
    const req = buildReq({ user: { user_id: 100, role_id: 3 } });
    const res = buildRes();
    
    // Paseo pertenece al cliente 100
    walk.findByPk.mockResolvedValueOnce(
      mockBasicWalk(1, 100, 200, "confirmado", 1)
    );
    
    walk.findByPk.mockResolvedValueOnce(
      mockFullWalk(1, 100, 200, "confirmado", 1)
    );
    
    pet_walk.findAll.mockResolvedValue(
      mockPetWalks(1, [1, 2])
    );

    await get_walk_by_id(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        client: expect.objectContaining({ user_id: 100 }),
      }),
    }));
  });

  // 7. Paseador accede a paseo asignado (200)
  test("paseador puede acceder a paseo asignado", async () => {
    const req = buildReq({ user: { user_id: 200, role_id: 2 } });
    const res = buildRes();
    
    // Paseo asignado al paseador 200
    walk.findByPk.mockResolvedValueOnce(
      mockBasicWalk(1, 100, 200, "confirmado", 1)
    );
    
    walk.findByPk.mockResolvedValueOnce(
      mockFullWalk(1, 100, 200, "confirmado", 1)
    );
    
    pet_walk.findAll.mockResolvedValue(
      mockPetWalks(1, [1, 2])
    );

    await get_walk_by_id(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        walker: expect.objectContaining({ user_id: 200 }),
      }),
    }));
  });

  // 8. Paseador accede a paseo pendiente (200)
  test("paseador puede acceder a paseo pendiente", async () => {
    const req = buildReq({ user: { user_id: 200, role_id: 2 } });
    const res = buildRes();
    
    // Paseo pendiente (sin walker_id)
    walk.findByPk.mockResolvedValueOnce(
      mockBasicWalk(1, 100, null, "pendiente", 1)
    );
    
    walk.findByPk.mockResolvedValueOnce(
      mockFullWalk(1, 100, null, "pendiente", 1)
    );
    
    pet_walk.findAll.mockResolvedValue(
      mockPetWalks(1, [1, 2])
    );

    await get_walk_by_id(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: "pendiente",
        walker: null,
      }),
    }));
  });

  // 9. Error interno del servidor (500)
  test("retorna 500 si ocurre un error inesperado", async () => {
    const originalConsole = console.error;
    console.error = jest.fn();

    const req = buildReq();
    const res = buildRes();
    
    // Simular error en la base de datos
    walk.findByPk.mockRejectedValue(new Error("Error de base de datos"));

    await get_walk_by_id(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Error al obtener el paseo",
      error: true,
    });

    console.error = originalConsole;
  });
});