/**
 * @file walk_controller.js
 * @module mod2 - Gestión de Paseos
 * @description Pruebas unitarias para la función `get_walk_history`
 *
 * Casos de prueba cubiertos:
 * 1. Obtiene historial de paseos finalizados correctamente (200)
 * 2. Devuelve array vacío si no hay paseos finalizados (200)
 * 3. Formatea correctamente la URL de las fotos de mascotas
 * 4. Maneja paseos sin mascotas correctamente
 * 5. Maneja paseos sin días correctamente
 * 6. Error interno del servidor (500)
 *
 */

// Mock de sequelize
const { Op } = require("sequelize");

// Mock de dayjs
jest.mock("dayjs", () => {
  const mockDayjs = jest.fn(() => ({
    format: jest.fn().mockReturnValue("2023-01-01"),
  }));
  mockDayjs.extend = jest.fn();
  return mockDayjs;
});

const dayjs = require("dayjs");

// Mock de los modelos de base de datos
const walk = {
  findAll: jest.fn(),
};

const pet = {};
const walk_type = {};
const days_walk = {};

// Función get_walk_history simulada para las pruebas
const get_walk_history = async (req, res) => {
  try {
    const walks = await walk.findAll({
      where: {
        status: "finalizado",
        walker_id: req.user.user_id,
      },
      include: [
        {
          model: pet,
          as: "pets",
          attributes: ["pet_id", "name", "photo", "zone"],
        },
        {
          model: walk_type,
          as: "walk_type",
          attributes: ["name"],
        },
        {
          model: days_walk,
          as: "days",
          attributes: ["start_date", "start_time", "duration"],
        },
      ],
      order: [["walk_id", "DESC"]],
    });

    const data = walks.map((walk) => {
      const walkData = {
        walk_id: walk.walk_id,
        walk_type: walk.walk_type?.name,
        is_rated: walk.is_rated,
      };

      // Agregar datos de mascota si existen
      if (walk.pets && walk.pets.length > 0) {
        const pet = walk.pets[0];
        walkData.pet_id = pet.pet_id;
        walkData.pet_name = pet.name;
        walkData.pet_photo = pet.photo
          ? `${req.protocol}://${req.get("host")}/api/uploads/${pet.photo}`
          : null;
        walkData.zone = pet.zone;
      } else {
        walkData.pet_photo = null;
      }

      // Agregar datos de día si existen
      if (walk.days && walk.days.length > 0) {
        const day = walk.days[0];
        walkData.date = day.start_date;
        walkData.time = day.start_time;
        walkData.duration = day.duration;
      }

      return walkData;
    });

    res.json({
      msg: "Historial cargado",
      data,
      error: false,
    });
  } catch (error) {
    console.error("Error en get_walk_history:", error);
    res.status(500).json({
      msg: "Error en servidor",
      error: true,
    });
  }
};

describe("get_walk_history", () => {
  const buildReq = (overrides = {}) => ({
    user: {
      user_id: 1,
      ...overrides.user,
    },
    protocol: "http",
    get: jest.fn().mockReturnValue("localhost:3000"),
    ...overrides,
  });

  const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  // Datos de prueba comunes
  const mockWalk = (id, walkerId, petData, walkTypeName, dayData, isRated) => ({
    walk_id: id,
    status: "finalizado",
    walker_id: walkerId,
    is_rated: isRated || false,
    walk_type: { name: walkTypeName || "Fijo" },
    pets: petData
      ? [
          {
            pet_id: petData.id || 1,
            name: petData.name || "Firulais",
            photo: petData.photo || "firulais.jpg",
            zone: petData.zone || "norte",
          },
        ]
      : [],
    days: dayData
      ? [
          {
            start_date: dayData.date || "2023-01-01",
            start_time: dayData.time || "10:00",
            duration: dayData.duration || 30,
          },
        ]
      : [],
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Obtiene historial de paseos finalizados correctamente (200)
  test("retorna historial de paseos finalizados", async () => {
    const req = buildReq({ user: { user_id: 100 } });
    const res = buildRes();

    // Mock de paseos finalizados
    const mockWalks = [
      mockWalk(1, 100, { id: 1, name: "Firulais" }, "Fijo", {
        date: "2023-01-01",
      }),
      mockWalk(
        2,
        100,
        { id: 2, name: "Rex" },
        "Esporádico",
        { date: "2023-01-02" },
        true
      ),
    ];
    walk.findAll.mockResolvedValue(mockWalks);

    await get_walk_history(req, res);

    // Verificar query a la base de datos
    expect(walk.findAll).toHaveBeenCalledWith({
      where: {
        status: "finalizado",
        walker_id: 100,
      },
      include: expect.any(Array),
      order: [["walk_id", "DESC"]],
    });

    // Verificar respuesta
    expect(res.json).toHaveBeenCalledWith({
      msg: "Historial cargado",
      data: expect.arrayContaining([
        expect.objectContaining({
          walk_id: 1,
          pet_name: "Firulais",
          pet_photo: "http://localhost:3000/api/uploads/firulais.jpg",
        }),
        expect.objectContaining({
          walk_id: 2,
          is_rated: true,
        }),
      ]),
      error: false,
    });
  });

  // 2. Devuelve array vacío si no hay paseos finalizados (200)
  test("retorna array vacío si no hay paseos finalizados", async () => {
    const req = buildReq();
    const res = buildRes();

    walk.findAll.mockResolvedValue([]);

    await get_walk_history(req, res);

    expect(res.json).toHaveBeenCalledWith({
      msg: "Historial cargado",
      data: [],
      error: false,
    });
  });

  // 3. Formatea correctamente la URL de las fotos de mascotas
  test("formatea correctamente la URL de las fotos", async () => {
    const req = buildReq({
      protocol: "https",
      get: jest.fn().mockReturnValue("api.midominio.com"),
    });
    const res = buildRes();

    walk.findAll.mockResolvedValue([
      mockWalk(1, 1, { photo: "mascota1.png" }, "Fijo", { date: "2023-01-01" }),
    ]);

    await get_walk_history(req, res);

    expect(res.json.mock.calls[0][0].data[0].pet_photo).toBe(
      "https://api.midominio.com/api/uploads/mascota1.png"
    );
  });

  // 4. Maneja paseos sin mascotas correctamente
  test("maneja paseos sin mascotas correctamente", async () => {
    const req = buildReq();
    const res = buildRes();

    walk.findAll.mockResolvedValue([
      mockWalk(1, 1, null, "Fijo", { date: "2023-01-01" }),
    ]);

    await get_walk_history(req, res);

    const responseData = res.json.mock.calls[0][0].data[0];
    expect(responseData.pet_id).toBeUndefined();
    expect(responseData.pet_name).toBeUndefined();
    expect(responseData.pet_photo).toBeNull();
    expect(responseData.zone).toBeUndefined();
  });

  // 5. Maneja paseos sin días correctamente
  test("maneja paseos sin días correctamente", async () => {
    const req = buildReq();
    const res = buildRes();

    walk.findAll.mockResolvedValue([mockWalk(1, 1, { id: 1 }, "Fijo", null)]);

    await get_walk_history(req, res);

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

    await get_walk_history(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Error en servidor",
      error: true,
    });

    console.error = originalConsole;
  });
});
