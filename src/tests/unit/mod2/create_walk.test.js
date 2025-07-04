/**
 * @file walk.controller.js
 * @module mod2 - Gestión de Paseos
 * @description Pruebas unitarias para la función `create_walk`
 *
 * Casos de prueba cubiertos:
 * 1. Tipo de paseo inválido (400)
 * 2. Paseo de prueba sin ticket disponible (403)
 * 3. Paseo de prueba con múltiples días (400)
 * 4. Paseo de prueba con formato de hora inválido (400)
 * 5. Paseo de prueba con duración inválida (400)
 * 6. Paseo de prueba sin mascotas seleccionadas (400)
 * 7. Paseo de prueba con mascotas no existentes (404)
 * 8. Paseo de prueba creado exitosamente (201)
 * 9. Paseo fijo con menos de 2 días (400)
 * 10. Paseo esporádico con más de 1 día (400)
 * 11. Paseo con formato de hora inválido (400)
 * 12. Paseo con duración inválida (400)
 * 13. Paseo con comentarios muy largos (400)
 * 14. Paseo creado exitosamente (201)
 * 15. Error interno del servidor (500)
 *
 */

const { create_walk } = require("../../../controllers/walk_controller");
const {
  walk,
  user,
  pet,
  days_walk,
  pet_walk,
  payment,
} = require("../../../models/database");
const { generate_days_for_week } = require("../../../utils/date_service");
const { calculate_payment_amount } = require("../../../utils/payment_service");
const dayjs = require("dayjs");

jest.mock("../../../models/database", () => ({
  walk: {
    create: jest.fn(),
    sequelize: {
      transaction: jest.fn(),
    },
  },
  user: { findByPk: jest.fn() },
  pet: { findAll: jest.fn() },
  days_walk: { create: jest.fn() },
  pet_walk: { create: jest.fn() },
  payment: { create: jest.fn() },
}));

jest.mock("../../../utils/date_service", () => ({
  generate_days_for_week: jest.fn(),
}));

jest.mock("../../../utils/payment_service", () => ({
  calculate_payment_amount: jest.fn(),
}));

// Mock más específico para Day.js
jest.mock("dayjs", () => {
  // Crear un objeto mock que simula una instancia de Day.js
  const createMockDayjs = (date) => ({
    format: jest.fn((formatStr) => {
      if (formatStr === "YYYY-MM-DD") return "2024-01-15";
      if (formatStr === "dddd") return "lunes";
      if (formatStr === "HH:mm") return "10:00";
      return "2024-01-15";
    }),
    isoWeekday: jest.fn(() => 1),
    startOf: jest.fn(() => createMockDayjs()),
    add: jest.fn(() => createMockDayjs()),
    subtract: jest.fn(() => createMockDayjs()),
    toDate: jest.fn(() => new Date("2024-01-15")),
    day: jest.fn(() => 1),
    clone: jest.fn(() => createMockDayjs()),
    valueOf: jest.fn(() => Date.now()),
    toString: jest.fn(() => "2024-01-15"),
  });

  // Función principal de Day.js
  const mockDayjs = jest.fn((date) => createMockDayjs(date));

  // Propiedades estáticas
  mockDayjs.extend = jest.fn();
  mockDayjs.locale = jest.fn();
  mockDayjs.tz = jest.fn();

  return mockDayjs;
});

describe("create_walk", () => {
  const build_mock_response = () => {
    const response = {};
    response.status = jest.fn().mockReturnValue(response);
    response.json = jest.fn().mockReturnValue(response);
    return response;
  };

  const build_mock_request = (body, user_data = { user_id: 1 }) => ({
    body,
    user: user_data,
  });

  const mock_transaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    walk.sequelize.transaction.mockResolvedValue(mock_transaction);
    calculate_payment_amount.mockReturnValue(15000);

    // Mock para generate_days_for_week
    generate_days_for_week.mockReturnValue([
      { start_date: "2024-01-15", start_time: "10:00", duration: 30 },
      { start_date: "2024-01-16", start_time: "10:00", duration: 30 },
    ]);
  });

  // 1. Tipo de paseo inválido (400)
  test("retorna 400 si el tipo de paseo es inválido", async () => {
    const request = build_mock_request({
      walk_type_id: 4,
      pet_ids: [1],
      start_time: "10:00",
      duration: 30,
      days: ["lunes"],
    });
    const response = build_mock_response();

    await create_walk(request, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      msg: "Tipo de paseo inválido",
      error: true,
    });
  });

  // 2. Paseo de prueba sin ticket disponible (403)
  test("retorna 403 si el usuario no tiene ticket de prueba disponible", async () => {
    user.findByPk.mockResolvedValue({ user_id: 1, ticket: false });

    const request = build_mock_request({
      walk_type_id: 3,
      pet_ids: [1],
      start_time: "10:00",
      duration: 30,
      days: ["lunes"],
    });
    const response = build_mock_response();

    await create_walk(request, response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      msg: "No tienes paseo de prueba disponible",
      error: true,
    });
  });

  // 3. Paseo de prueba con múltiples días (400)
  test("retorna 400 si el paseo de prueba tiene múltiples días", async () => {
    user.findByPk.mockResolvedValue({ user_id: 1, ticket: true });

    const request = build_mock_request({
      walk_type_id: 3,
      pet_ids: [1],
      start_time: "10:00",
      duration: 30,
      days: ["lunes", "martes"],
    });
    const response = build_mock_response();

    await create_walk(request, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      msg: "Para un paseo de prueba debes indicar exactamente un día",
      error: true,
    });
  });

  // 4. Paseo de prueba con formato de hora inválido (400)
  test("retorna 400 si el formato de hora es inválido en paseo de prueba", async () => {
    user.findByPk.mockResolvedValue({ user_id: 1, ticket: true });

    const request = build_mock_request({
      walk_type_id: 3,
      pet_ids: [1],
      start_time: "25:00",
      duration: 30,
      days: ["lunes"],
    });
    const response = build_mock_response();

    await create_walk(request, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      msg: "Formato de hora inválido",
      error: true,
    });
  });

  // 5. Paseo de prueba con duración inválida (400)
  test("retorna 400 si la duración es inválida en paseo de prueba", async () => {
    user.findByPk.mockResolvedValue({ user_id: 1, ticket: true });

    const request = build_mock_request({
      walk_type_id: 3,
      pet_ids: [1],
      start_time: "10:00",
      duration: 45,
      days: ["lunes"],
    });
    const response = build_mock_response();

    await create_walk(request, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      msg: "Duración inválida",
      error: true,
    });
  });

  // 6. Paseo de prueba sin mascotas seleccionadas (400)
  test("retorna 400 si no se seleccionan mascotas en paseo de prueba", async () => {
    user.findByPk.mockResolvedValue({ user_id: 1, ticket: true });

    const request = build_mock_request({
      walk_type_id: 3,
      pet_ids: [],
      start_time: "10:00",
      duration: 30,
      days: ["lunes"],
    });
    const response = build_mock_response();

    await create_walk(request, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      msg: "Debes seleccionar al menos una mascota",
      error: true,
    });
  });

  // 7. Paseo de prueba con mascotas no existentes (404)
  test("retorna 404 si las mascotas no existen o no pertenecen al usuario", async () => {
    user.findByPk.mockResolvedValue({ user_id: 1, ticket: true });
    pet.findAll.mockResolvedValue([]);

    const request = build_mock_request({
      walk_type_id: 3,
      pet_ids: [1, 2],
      start_time: "10:00",
      duration: 30,
      days: ["lunes"],
    });
    const response = build_mock_response();

    await create_walk(request, response);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      msg: "Una o más mascotas no existen o no te pertenecen",
      error: true,
    });
  });

  // 8. Paseo de prueba creado exitosamente (201)
  test("retorna 201 cuando se crea un paseo de prueba exitosamente", async () => {
    user.findByPk.mockResolvedValue({
      user_id: 1,
      ticket: true,
      update: jest.fn().mockResolvedValue(true),
    });
    pet.findAll.mockResolvedValue([{ pet_id: 1, name: "Firulais" }]);
    walk.create.mockResolvedValue({ walk_id: 1 });
    days_walk.create.mockResolvedValue({});
    pet_walk.create.mockResolvedValue({});
    payment.create.mockResolvedValue({});

    const request = build_mock_request({
      walk_type_id: 3,
      pet_ids: [1],
      start_time: "10:00",
      duration: 30,
      days: ["lunes"],
    });
    const response = build_mock_response();

    await create_walk(request, response);

    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({
      msg: "Paseo de prueba creado exitosamente",
      walk_id: 1,
      error: false,
    });
    expect(mock_transaction.commit).toHaveBeenCalled();
  });

  // 9. Paseo fijo con menos de 2 días (400)
  test("retorna 400 si el paseo fijo tiene menos de 2 días", async () => {
    pet.findAll.mockResolvedValue([{ pet_id: 1, name: "Firulais" }]);

    const request = build_mock_request({
      walk_type_id: 1,
      pet_ids: [1],
      start_time: "10:00",
      duration: 30,
      days: ["lunes"],
    });
    const response = build_mock_response();

    await create_walk(request, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      msg: "Un paseo fijo requiere al menos 2 días",
      error: true,
    });
  });

  // 10. Paseo esporádico con más de 1 día (400)
  test("retorna 400 si el paseo esporádico tiene más de 1 día", async () => {
    pet.findAll.mockResolvedValue([{ pet_id: 1, name: "Firulais" }]);

    const request = build_mock_request({
      walk_type_id: 2,
      pet_ids: [1],
      start_time: "10:00",
      duration: 30,
      days: ["lunes", "martes"],
    });
    const response = build_mock_response();

    await create_walk(request, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      msg: "Un paseo esporádico debe tener exactamente 1 día",
      error: true,
    });
  });

  // 11. Paseo con formato de hora inválido (400)
  test("retorna 400 si el formato de hora es inválido", async () => {
    pet.findAll.mockResolvedValue([{ pet_id: 1, name: "Firulais" }]);

    const request = build_mock_request({
      walk_type_id: 2,
      pet_ids: [1],
      start_time: "hora_invalida",
      duration: 30,
      days: ["lunes"],
    });
    const response = build_mock_response();

    await create_walk(request, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      msg: "Formato de hora inválido",
      error: true,
    });
  });

  // 12. Paseo con duración inválida (400)
  test("retorna 400 si la duración es inválida", async () => {
    pet.findAll.mockResolvedValue([{ pet_id: 1, name: "Firulais" }]);

    const request = build_mock_request({
      walk_type_id: 2,
      pet_ids: [1],
      start_time: "10:00",
      duration: 90,
      days: ["lunes"],
    });
    const response = build_mock_response();

    await create_walk(request, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      msg: "Duración inválida",
      error: true,
    });
  });

  // 13. Paseo con comentarios muy largos (400)
  test("retorna 400 si los comentarios son muy largos", async () => {
    pet.findAll.mockResolvedValue([{ pet_id: 1, name: "Firulais" }]);

    const request = build_mock_request({
      walk_type_id: 2,
      pet_ids: [1],
      start_time: "10:00",
      duration: 30,
      days: ["lunes"],
      comments: "a".repeat(251),
    });
    const response = build_mock_response();

    await create_walk(request, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      msg: "Comentarios muy largos",
      error: true,
    });
  });

  // 14. Paseo creado exitosamente (201)
  test("retorna 201 cuando se crea un paseo exitosamente", async () => {
    pet.findAll.mockResolvedValue([{ pet_id: 1, name: "Firulais" }]);
    walk.create.mockResolvedValue({ walk_id: 2 });
    days_walk.create.mockResolvedValue({});
    pet_walk.create.mockResolvedValue({});
    payment.create.mockResolvedValue({});

    const request = build_mock_request({
      walk_type_id: 1,
      pet_ids: [1],
      start_time: "10:00",
      duration: 30,
      days: ["lunes", "martes"],
    });
    const response = build_mock_response();

    await create_walk(request, response);

    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({
      msg: "Paseo creado exitosamente",
      walk_id: 2,
      error: false,
    });
    expect(mock_transaction.commit).toHaveBeenCalled();
  });

  // 15. Error interno del servidor (500)
  test("retorna 500 si ocurre un error inesperado", async () => {
    const original_console_error = console.error;
    console.error = jest.fn();

    pet.findAll.mockRejectedValue(new Error("DB failure"));

    const request = build_mock_request({
      walk_type_id: 2,
      pet_ids: [1],
      start_time: "10:00",
      duration: 30,
      days: ["lunes"],
    });
    const response = build_mock_response();

    await create_walk(request, response);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      msg: "Error al crear el paseo",
      error: true,
    });

    console.error = original_console_error;
  });
});
