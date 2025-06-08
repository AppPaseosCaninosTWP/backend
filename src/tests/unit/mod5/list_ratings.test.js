/**
 * @file rating_controller.js
 * @module mod5 - Calificaciones
 * @description Pruebas unitarias para la función `list_ratings`
 *
 * Casos de prueba cubiertos:
 * 1. Listado vacío (200 con array vacío)
 * 2. Listado exitoso de calificaciones (200 con datos)
 * 3. Error interno del servidor (500)
 *
 * Basado en: ERS v2.7 - Requerimiento CALF-001
 */
const { list_ratings } = require("../../../controllers/rating_controller");
const { rating: Rating } = require("../../../models/database");

jest.mock("../../../models/database", () => ({
  rating: {
    findAndCountAll: jest.fn(),
  },
}));

describe("list_ratings", () => {
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

  test("1. Listado vacío (200 con array vacío)", async () => {
    const req = { query: {} };
    const res = buildRes();

    Rating.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await list_ratings(req, res);

    expect(Rating.findAndCountAll).toHaveBeenCalledWith({
      limit:  10,
      offset: 0,
      order:  [["created_at", "DESC"]],
    });
    expect(res.json).toHaveBeenCalledWith({
      msg:         "No hay calificaciones registradas",
      total_pages: 0,
      total_items: 0,
      ratings:     [],
    });
  });

  test("2. Listado exitoso de calificaciones (200 con datos)", async () => {
    const req = { query: { page: "2" } };
    const res = buildRes();
    const fakeRows = [
      { id: 1, value: 4, comment: "Bien" },
      { id: 2, value: 5, comment: "Excelente" },
    ];
    Rating.findAndCountAll.mockResolvedValue({ count: 15, rows: fakeRows });

    await list_ratings(req, res);

    expect(Rating.findAndCountAll).toHaveBeenCalledWith({
      limit:  10,
      offset: 10,
      order:  [["created_at", "DESC"]],
    });
    expect(res.json).toHaveBeenCalledWith({
      page:         2,
      total_pages:  2,
      total_items:  15,
      ratings:      fakeRows,
    });
  });

  test("3. Error interno del servidor (500)", async () => {
    const req = { query: {} };
    const res = buildRes();

    Rating.findAndCountAll.mockRejectedValue(new Error("DB crash"));

    await list_ratings(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg:   "Error al listar calificaciones",
      error: true,
    });
  });
});
