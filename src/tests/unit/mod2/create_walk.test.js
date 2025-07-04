/**
 * @file walk_controller.js
 * @module mod2 - Gestión de Paseos
 * @description Pruebas unitarias para la función `create_walk`
 *
 * Casos de prueba cubiertos:
 * 1. Validación de tipo de paseo inválido (400)
 * 2. Paseo de prueba sin ticket disponible (403)
 * 3. Paseo de prueba con validaciones incorrectas (400)
 * 4. Paseo de prueba exitoso (201)
 * 5. Paseo fijo con menos de 2 días (400)
 * 6. Paseo esporádico con más de 1 día (400)
 * 7. Creación exitosa de paseo fijo (201)
 * 8. Creación exitosa de paseo esporádico (201)
 * 9. Error interno del servidor (500)
 *
 */

const { create_walk } = require("../../controllers/walk_controller");
const { user, pet, walk, days_walk, pet_walk, payment } = require("../../models/database");
const dayjs = require("dayjs");
const { Op } = require("sequelize");
const { calculate_payment_amount } = require("../../utils/payment_service");
const { generate_days_for_week } = require("../../utils/date_service");

// Mock de todas las dependencias
jest.mock("../../models/database", () => ({
  user: {
    findByPk: jest.fn(),
  },
  pet: {
    findAll: jest.fn(),
  },
  walk: {
    create: jest.fn(),
    sequelize: {
      transaction: jest.fn(() => ({
        commit: jest.fn(),
        rollback: jest.fn(),
      })),
    },
  },
  days_walk: {
    create: jest.fn(),
  },
  pet_walk: {
    create: jest.fn(),
  },
  payment: {
    create: jest.fn(),
  },
}));

jest.mock("../../utils/payment_service", () => ({
  calculate_payment_amount: jest.fn(),
}));

jest.mock("../../utils/date_service", () => ({
  generate_days_for_week: jest.fn(),
}));

jest.mock("dayjs", () => {
  const mockDayjs = jest.fn(() => ({
    startOf: jest.fn().mockReturnThis(),
    isoWeekday: jest.fn().mockReturnThis(),
    add: jest.fn().mockReturnThis(),
    format: jest.fn().mockReturnValue("2023-01-01"),
    toDate: jest.fn().mockReturnValue(new Date()),
  }));
  mockDayjs.extend = jest.fn();
  return mockDayjs;
});

describe("create_walk", () => {
  const buildReq = (overrides = {}) => ({
    body: {
      walk_type_id: 1, // Fijo por defecto
      pet_ids: [1, 2],
      comments: "Comentarios de prueba",
      start_time: "10:00",
      duration: 30,
      days: ["lunes", "miercoles"],
      usar_ticket: false,
      ...overrides.body,
    },
    user: {
      user_id: 1,
      ...overrides.user,
    },
  });

  const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Configuración común para mocks
    calculate_payment_amount.mockReturnValue(10000); // $10.000 CLP
    generate_days_for_week.mockReturnValue([
      { start_date: "2023-01-02", start_time: "10:00", duration: 30 },
      { start_date: "2023-01-04", start_time: "10:00", duration: 30 },
    ]);
  });

  // 1. Validación de tipo de paseo inválido (400)
  test("retorna 400 si el tipo de paseo no es válido", async () => {
    const req = buildReq({ body: { walk_type_id: 99 } });
    const res = buildRes();

    await create_walk(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Tipo de paseo inválido",
      error: true,
    });
  });

  // 2. Paseo de prueba sin ticket disponible (403)
  test("retorna 403 si el usuario no tiene ticket para paseo de prueba", async () => {
    const req = buildReq({ body: { walk_type_id: 3 } });
    const res = buildRes();
    user.findByPk.mockResolvedValue({ user_id: 1, ticket: false });

    await create_walk(req, res);

    expect(user.findByPk).toHaveBeenCalledWith(1, {
      attributes: ["user_id", "ticket"],
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      msg: "No tienes paseo de prueba disponible",
      error: true,
    });
  });

  // 3. Paseo de prueba con validaciones incorrectas (400)
  test("retorna 400 si paseo de prueba no tiene exactamente un día", async () => {
    const req = buildReq({ 
      body: { 
        walk_type_id: 3,
        days: ["lunes", "martes"], // Más de un día
        usar_ticket: true
      } 
    });
    const res = buildRes();
    user.findByPk.mockResolvedValue({ user_id: 1, ticket: true });

    await create_walk(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Para un paseo de prueba debes indicar exactamente un día",
      error: true,
    });
  });

  // 4. Paseo de prueba exitoso (201)
  test("retorna 201 al crear paseo de prueba correctamente", async () => {
    const req = buildReq({ 
      body: { 
        walk_type_id: 3,
        days: ["lunes"],
        usar_ticket: true
      } 
    });
    const res = buildRes();
    
    // Mock de usuario con ticket
    user.findByPk.mockResolvedValue({ 
      user_id: 1, 
      ticket: true,
      update: jest.fn().mockResolvedValue(true)
    });
    
    // Mock de mascotas válidas
    pet.findAll.mockResolvedValue([{ pet_id: 1 }, { pet_id: 2 }]);
    
    // Mock de creación de paseo
    walk.create.mockResolvedValue({ walk_id: 100 });
    
    // Mock de transacción
    const mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    walk.sequelize.transaction.mockResolvedValue(mockTransaction);

    await create_walk(req, res);

    // Verificar que se consumió el ticket
    expect(user.findByPk().update).toHaveBeenCalledWith(
      { ticket: 0 },
      { transaction: mockTransaction }
    );
    
    // Verificar que se creó el pago con estado "pendiente"
    expect(payment.create).toHaveBeenCalledWith(
      {
        amount: expect.any(Number),
        date: expect.any(Date),
        status: "pendiente",
        walk_id: 100,
      },
      { transaction: mockTransaction }
    );
    
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Paseo de prueba creado exitosamente",
      walk_id: 100,
      error: false,
    });
  });

  // 5. Paseo fijo con menos de 2 días (400)
  test("retorna 400 si paseo fijo tiene menos de 2 días", async () => {
    const req = buildReq({ body: { days: ["lunes"] } }); // Solo 1 día
    const res = buildRes();

    await create_walk(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Un paseo fijo requiere al menos 2 días",
      error: true,
    });
  });

  // 6. Paseo esporádico con más de 1 día (400)
  test("retorna 400 si paseo esporádico no tiene exactamente un día", async () => {
    const req = buildReq({ 
      body: { 
        walk_type_id: 2, // Esporádico
        days: ["lunes", "martes"] // 2 días
      } 
    });
    const res = buildRes();

    await create_walk(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Un paseo esporádico debe tener exactamente 1 día",
      error: true,
    });
  });

  // 7. Creación exitosa de paseo fijo (201)
  test("retorna 201 al crear paseo fijo correctamente", async () => {
    const req = buildReq();
    const res = buildRes();
    
    // Mock de mascotas válidas
    pet.findAll.mockResolvedValue([{ pet_id: 1 }, { pet_id: 2 }]);
    
    // Mock de creación de paseo
    walk.create.mockResolvedValue({ walk_id: 101 });
    
    // Mock de transacción
    const mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    walk.sequelize.transaction.mockResolvedValue(mockTransaction);

    await create_walk(req, res);

    // Verificar generación de días
    expect(generate_days_for_week).toHaveBeenCalledWith(
      ["lunes", "miercoles"],
      "10:00",
      30
    );
    
    // Verificar creación de pago
    expect(payment.create).toHaveBeenCalledWith(
      {
        amount: 10000,
        date: expect.any(Date),
        status: "pendiente",
        walk_id: 101,
      },
      { transaction: mockTransaction }
    );
    
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Paseo creado exitosamente",
      walk_id: 101,
      error: false,
    });
  });

  // 8. Creación exitosa de paseo esporádico (201)
  test("retorna 201 al crear paseo esporádico correctamente", async () => {
    const req = buildReq({ 
      body: { 
        walk_type_id: 2, // Esporádico
        days: ["viernes"] // Solo 1 día
      } 
    });
    const res = buildRes();
    
    // Mock de mascotas válidas
    pet.findAll.mockResolvedValue([{ pet_id: 1 }, { pet_id: 2 }]);
    
    // Mock de creación de paseo
    walk.create.mockResolvedValue({ walk_id: 102 });
    
    // Mock de transacción
    const mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    walk.sequelize.transaction.mockResolvedValue(mockTransaction);

    await create_walk(req, res);

    // Verificar que no se usó generate_days_for_week
    expect(generate_days_for_week).not.toHaveBeenCalled();
    
    // Verificar creación de días directamente
    expect(days_walk.create).toHaveBeenCalledWith(
      {
        walk_id: 102,
        start_date: "2023-01-01",
        start_time: "10:00",
        duration: 30,
      },
      { transaction: mockTransaction }
    );
    
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Paseo creado exitosamente",
      walk_id: 102,
      error: false,
    });
  });

  // 9. Error interno del servidor (500)
  test("retorna 500 si ocurre un error inesperado", async () => {
    const originalConsole = console.error;
    console.error = jest.fn();

    const req = buildReq();
    const res = buildRes();
    
    // Simular error en la base de datos
    pet.findAll.mockRejectedValue(new Error("Error de base de datos"));

    await create_walk(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Error al crear el paseo",
      error: true,
    });

    console.error = originalConsole;
  });
});