/**
 * @file rating_controller.js
 * @module mod5 - Calificaciones
 * @description Pruebas unitarias para la función `get_walk_ratings`
 *
 * Casos de prueba cubiertos:
 * 1. walk_id inválido (400)
 * 2. No hay calificaciones asociadas a este paseo (200)
 * 3. Paseo con calificaciones (200)
 * 4. Error interno del servidor (500)
 *
 * Basado en: ERS v2.7 - Requerimiento CALF-002
 */

const { get_walk_ratings } = require("../../../controllers/rating_controller");
const { rating: Rating } = require("../../../models/database");

jest.mock("../../../models/database", () => ({
  rating: {
    findAll: jest.fn(),
  },
}));

describe("get_walk_ratings", () => {
  // Silenciar console.error
  let _origError;
  beforeAll(() => {
    _origError = console.error;
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = _origError;
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

  test("1. walk_id inválido (400)", async () => {
    const req = { params: { walk_id: "no-numérico" } };
    const res = buildRes();

    await get_walk_ratings(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ msg: "walk_id inválido", error: true });
  });

  test("2. No hay calificaciones asociadas a este paseo (200)", async () => {
    const req = { params: { walk_id: "5" } };
    const res = buildRes();

    Rating.findAll.mockResolvedValue([]);

    await get_walk_ratings(req, res);

    expect(Rating.findAll).toHaveBeenCalledWith({
      where: { walk_id: 5 },
      order: [["created_at", "DESC"]],
    });
    expect(res.json).toHaveBeenCalledWith({
      msg:         "No hay calificaciones asociadas a este paseo",
      total_items: 0,
      ratings:     [],
    });
  });

  test("3. Paseo con calificaciones (200)", async () => {
    const req = { params: { walk_id: "7" } };
    const res = buildRes();
    const fakeRatings = [
      { id: 10, value: 3.5, comment: "Regular" },
      { id: 11, value: 5,   comment: "Perfecto" },
    ];

    Rating.findAll.mockResolvedValue(fakeRatings);

    await get_walk_ratings(req, res);

    expect(Rating.findAll).toHaveBeenCalledWith({
      where: { walk_id: 7 },
      order: [["created_at", "DESC"]],
    });
    expect(res.json).toHaveBeenCalledWith({
      total_items: fakeRatings.length,
      ratings:     fakeRatings,
    });
  });

  test("4. Error interno del servidor (500)", async () => {
    const req = { params: { walk_id: "9" } };
    const res = buildRes();

    Rating.findAll.mockRejectedValue(new Error("DB crash"));

    await get_walk_ratings(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg:   "Error al obtener calificaciones de paseo",
      error: true,
    });
  });
});
