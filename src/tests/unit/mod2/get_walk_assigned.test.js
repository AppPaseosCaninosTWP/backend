/**
 * @file walk_controller.js
 * @module mod2 - Gestión de Paseos
 * @description Pruebas unitarias para la función `get_walk_assigned`
 *
 * Casos de prueba cubiertos:
 * 1. Obtiene paseos asignados correctamente (200)
 * 2. Devuelve array vacío si no hay paseos asignados (200)
 * 3. Filtra correctamente por fechas futuras
 * 4. Maneja paseos sin mascotas correctamente
 * 5. Maneja paseos sin días correctamente
 * 6. Error interno del servidor (500)
 *
 */

const { get_walk_assigned } = require("../../controllers/walk_controller");
const { walk, pet, days_walk } = require("../../models/database");
const { Op } = require("sequelize");
const dayjs = require("dayjs");

// Mock de todas las dependencias
jest.mock("../../models/database", () => ({
  walk: {
    findAll: jest.fn(),
  },
  pet: {},
  days_walk: {},
}));

jest.mock("dayjs", () => {
  const mockDayjs = jest.fn(() => ({
    format: jest.fn().mockReturnValue("2023-01-01"),
  }));
  mockDayjs.extend = jest.fn();
  return mockDayjs;
});

describe("get_walk_assigned", () => {
  const buildReq = (overrides = {}) => ({
    user: {
      user_id: 1,
      ...overrides.user,
    },
    ...overrides,
  });

  const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  // Datos de prueba comunes
  const mockWalk = (id, walkerId, petData, dayData) => ({
    walk_id: id,
    status: "confirmado",
    walker_id: walkerId,
    pets: petData ? [{
      pet_id: petData.id || 1,
      name: petData.name || "Firulais",
      photo: petData.photo || "firulais.jpg",
      zone: petData.zone || "norte",
    }] : [],
    days: dayData ? [{
      start_date: dayData.date || "2023-01-01",
      start_time: dayData.time || "10:00",
      duration: dayData.duration || 30,
    }] : [],
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Obtiene paseos asignados correctamente (200)
  test("retorna paseos asignados correctamente", async () => {
    const req = buildReq({ user: { user_id: 100 } });
    const res = buildRes();
    
    // Mock de paseos asignados
    const mockWalks = [
      mockWalk(1, 100, { id: 1, name: "Firulais" }, { date: "2023-01-02" }),
      mockWalk(2, 100, { id: 2, name: "Rex" }, { date: "2023-01-03" }),
    ];
    walk.findAll.mockResolvedValue(mockWalks);

    await get_walk_assigned(req, res);

    // Verificar query a la base de datos
    expect(walk.findAll).toHaveBeenCalledWith({
      where: {
        status: "confirmado",
        walker_id: 100,
      },
      include: expect.any(Array),
      order: [["walk_id", "DESC"]],
    });

    // Verificar respuesta
    expect(res.json).toHaveBeenCalledWith({
      msg: "Paseos asignados",
      data: expect.arrayContaining([
        expect.objectContaining({
          walk_id: 1,
          pet_name: "Firulais",
          date: "2023-01-02",
        }),
        expect.objectContaining({
          walk_id: 2,
          pet_name: "Rex",
        }),
      ]),
      error: false,
    });
  });

  // 2. Devuelve array vacío si no hay paseos asignados (200)
  test("retorna array vacío si no hay paseos asignados", async () => {
    const req = buildReq();
    const res = buildRes();
    
    walk.findAll.mockResolvedValue([]);

    await get_walk_assigned(req, res);

    expect(res.json).toHaveBeenCalledWith({
      msg: "Paseos asignados",
      data: [],
      error: false,
    });
  });

  // 3. Filtra correctamente por fechas futuras
  test("filtra paseos por fechas futuras", async () => {
    const req = buildReq();
    const res = buildRes();
    
    walk.findAll.mockResolvedValue([
      mockWalk(1, 1, { id: 1 }, { date: "2023-01-02" }),
    ]);

    await get_walk_assigned(req, res);

    // Verificar que se filtra por fecha mayor o igual a hoy
    expect(walk.findAll).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.arrayContaining([
        expect.objectContaining({
          where: {
            start_date: {
              [Op.gte]: "2023-01-01", // Valor mockeado de dayjs
            },
          },
        }),
      ]),
    }));
  });

  // 4. Maneja paseos sin mascotas correctamente
  test("maneja paseos sin mascotas correctamente", async () => {
    const req = buildReq();
    const res = buildRes();
    
    walk.findAll.mockResolvedValue([
      mockWalk(1, 1, null, { date: "2023-01-02" }),
    ]);

    await get_walk_assigned(req, res);

    const responseData = res.json.mock.calls[0][0].data[0];
    expect(responseData.pet_id).toBeUndefined();
    expect(responseData.pet_name).toBeUndefined();
    expect(responseData.pet_photo).toBeUndefined();
    expect(responseData.zone).toBeUndefined();
  });

  // 5. Maneja paseos sin días correctamente
  test("maneja paseos sin días correctamente", async () => {
    const req = buildReq();
    const res = buildRes();
    
    walk.findAll.mockResolvedValue([
      mockWalk(1, 1, { id: 1 }, null),
    ]);

    await get_walk_assigned(req, res);

    const responseData = res.json.mock.calls[0][0].data[0];
    expect(responseData.date).toBeUndefined();
    expect(responseData.time).toBeUndefined();
    expect(responseData.duration).toBeUndefined();
  });

  // 6. Error interno del servidor (500)
  test("retorna 500 si ocurre un error inesperado", async () => {
    const originalConsole = console.error;
    console.error = jest.fn();

    const req = buildReq();
    const res = buildRes();
    
    walk.findAll.mockRejectedValue(new Error("Error de base de datos"));

    await get_walk_assigned(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Error en el servidor",
      error: true,
    });

    console.error = originalConsole;
  });
});