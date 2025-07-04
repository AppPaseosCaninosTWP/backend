/**
 * @file rating_controller.js
 * @module mod5 - Calificaciones
 * @description Pruebas unitarias para la función `get_user_ratings`
 *
 * Casos de prueba cubiertos:
 * 1. ID inválido (400)
 * 2. No hay calificaciones para este usuario (200)
 * 3. Usuario con calificaciones válidas (200)
 * 4. Error interno del servidor (500)
 *
 * Basado en: ERS v2.7 - Requerimiento CALF-001
 */

const { get_user_ratings } = require("../../../controllers/rating_controller");
const { rating: Rating } = require("../../../models/database");
const { fn, col } = require("sequelize");

jest.mock("../../../models/database", () => ({
  rating: {
    findAll: jest.fn(),
    findOne: jest.fn(),
  },
}));

describe("get_user_ratings", () => {
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

  test("1. ID inválido (400)", async () => {
    const req = { params: { user_id: "no-numérico" } };
    const res = buildRes();

    await get_user_ratings(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ msg: "user_id inválido", error: true });
  });

  test("2. No hay calificaciones para este usuario (200)", async () => {
    const req = { params: { user_id: "5" } };
    const res = buildRes();

    Rating.findAll.mockResolvedValue([]);

    await get_user_ratings(req, res);

    expect(Rating.findAll).toHaveBeenCalledWith({
      where: { receiver_id: 5 },
      order: [["created_at", "DESC"]],
    });
    expect(res.json).toHaveBeenCalledWith({
      msg:            "No hay calificaciones para este usuario",
      user_id:        5,
      total_items:    0,
      average_rating: 0,
      ratings:        [],
    });
  });

  test("3. Usuario con calificaciones válidas (200)", async () => {
    const req = { params: { user_id: "7" } };
    const res = buildRes();
    const fakeRatings = [
      { id: 1, value: 4, comment: "Buen servicio" },
      { id: 2, value: 5, comment: "Excelente" },
    ];

    Rating.findAll.mockResolvedValue(fakeRatings);
    Rating.findOne.mockResolvedValue({ average_rating: "4.50" });

    await get_user_ratings(req, res);

    expect(Rating.findAll).toHaveBeenCalledWith({
      where: { receiver_id: 7 },
      order: [["created_at", "DESC"]],
    });
    expect(Rating.findOne).toHaveBeenCalledWith({
      attributes: [[fn("AVG", col("value")), "average_rating"]],
      where:      { receiver_id: 7 },
      raw:        true,
    });
    expect(res.json).toHaveBeenCalledWith({
      user_id:        7,
      total_items:    fakeRatings.length,
      average_rating: 4.5,
      ratings:        fakeRatings,
    });
  });

  test("4. Error interno del servidor (500)", async () => {
    const req = { params: { user_id: "9" } };
    const res = buildRes();

    Rating.findAll.mockRejectedValue(new Error("DB crash"));

    await get_user_ratings(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg:   "Error al obtener calificaciones de usuario",
      error: true,
    });
  });
});
