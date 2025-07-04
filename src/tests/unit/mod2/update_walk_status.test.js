/**
 * @file walk_controller.js
 * @module mod2 - Gestión de Paseos
 * @description Pruebas unitarias para la función `update_walk_status`
 *
 * Casos de prueba cubiertos:
 * 1. Estado inválido (400)
 * 2. Paseo no encontrado (404)
 * 3. Confirmación exitosa (200)
 * 4. Cancelación exitosa (200)
 * 5. Cancelación con menos de 30 minutos (400)
 * 6. Marcado como "en curso" (200)
 * 7. Finalización exitosa sin ratings (200)
 * 8. Finalización con ratings válidos (200)
 * 9. Finalización con rating inválido (400)
 * 10. Error interno del servidor (500)
 *
 */

const { update_walk_status } = require("../../../controllers/walk_controller");
const { walk, days_walk, rating } = require("../../../models/database");
const dayjs = require("dayjs");

// Mock de todas las dependencias
jest.mock("../../../models/database", () => ({
  walk: {
    findByPk: jest.fn(),
  },
  days_walk: {
    findOne: jest.fn(),
  },
  rating: {
    create: jest.fn(),
  },
}));

jest.mock("dayjs", () => {
  const mockDayjs = jest.fn(() => ({
    diff: jest.fn(),
    format: jest.fn(),
  }));
  mockDayjs.extend = jest.fn();
  return mockDayjs;
});

describe("update_walk_status", () => {
  const buildReq = (overrides = {}) => ({
    params: {
      id: "1",
      ...overrides.params,
    },
    body: {
      new_status: "confirmado",
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

  // Mock de walk_record con métodos de instancia
  const mockWalkRecord = (status, clientId, walkerId = null) => ({
    walk_id: 1,
    status,
    client_id: clientId,
    walker_id: walkerId,
    update: jest.fn().mockResolvedValue(true),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Configurar mocks por defecto
    dayjs.mockImplementation(() => ({
      diff: jest.fn().mockReturnValue(60), // 60 minutos por defecto
      format: jest.fn().mockReturnValue("2023-01-01"),
    }));
  });

  // 1. Estado inválido (400)
  test("retorna 400 si el estado no es válido", async () => {
    const req = buildReq({ body: { new_status: "invalid_status" } });
    const res = buildRes();

    await update_walk_status(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Estado inválido",
      error: true,
    });
  });

  // 2. Paseo no encontrado (404)
  test("retorna 404 si el paseo no existe", async () => {
    const req = buildReq();
    const res = buildRes();
    
    walk.findByPk.mockResolvedValue(null);

    await update_walk_status(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Paseo no encontrado",
      error: true,
    });
  });

  // 3. Confirmación exitosa (200)
  test("confirma paseo pendiente correctamente", async () => {
    const req = buildReq({ body: { new_status: "confirmado" } });
    const res = buildRes();
    
    const walkRecord = mockWalkRecord("pendiente", 100);
    walk.findByPk.mockResolvedValue(walkRecord);

    await update_walk_status(req, res);

    expect(walkRecord.update).toHaveBeenCalledWith({
      status: "confirmado",
      walker_id: req.user.user_id,
    });
    expect(res.json).toHaveBeenCalledWith({
      msg: "Paseo confirmado",
      error: false,
    });
  });

  // 4. Cancelación exitosa (200)
  test("cancela paseo con suficiente anticipación", async () => {
    const req = buildReq({ body: { new_status: "cancelado" } });
    const res = buildRes();
    
    const walkRecord = mockWalkRecord("confirmado", 100, 1);
    walk.findByPk.mockResolvedValue(walkRecord);
    days_walk.findOne.mockResolvedValue({
      start_date: "2023-01-02",
      start_time: "14:00",
    });

    // Mock de diferencia de tiempo (60 minutos)
    dayjs.mockImplementation(() => ({
      diff: jest.fn().mockReturnValue(60),
      format: jest.fn(),
    }));

    await update_walk_status(req, res);

    expect(walkRecord.update).toHaveBeenCalledWith({
      status: "pendiente",
      walker_id: null,
    });
    expect(res.json).toHaveBeenCalledWith({
      msg: "Paseo cancelado",
      error: false,
    });
  });

  // 5. Cancelación con menos de 30 minutos (400)
  test("rechaza cancelación con menos de 30 minutos", async () => {
    const req = buildReq({ body: { new_status: "cancelado" } });
    const res = buildRes();
    
    const walkRecord = mockWalkRecord("confirmado", 100, 1);
    walk.findByPk.mockResolvedValue(walkRecord);
    days_walk.findOne.mockResolvedValue({
      start_date: "2023-01-02",
      start_time: "14:00",
    });

    // Mock de diferencia de tiempo (20 minutos)
    dayjs.mockImplementation(() => ({
      diff: jest.fn().mockReturnValue(20),
      format: jest.fn(),
    }));

    await update_walk_status(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      msg: "No se puede cancelar con menos de 30 minutos de anticipación",
      error: true,
    });
  });

  // 6. Marcado como "en curso" (200)
  test("marca paseo como en curso correctamente", async () => {
    const req = buildReq({ body: { new_status: "en_curso" } });
    const res = buildRes();
    
    const walkRecord = mockWalkRecord("confirmado", 100, 1);
    walk.findByPk.mockResolvedValue(walkRecord);

    await update_walk_status(req, res);

    expect(walkRecord.update).toHaveBeenCalledWith({
      status: "en_curso",
    });
    expect(res.json).toHaveBeenCalledWith({
      msg: "Paseo en_curso",
      error: false,
    });
  });

  // 7. Finalización exitosa sin ratings (200)
  test("finaliza paseo sin ratings correctamente", async () => {
    const req = buildReq({ body: { new_status: "finalizado" } });
    const res = buildRes();
    
    const walkRecord = mockWalkRecord("en_curso", 100, 1);
    walk.findByPk.mockResolvedValue(walkRecord);

    await update_walk_status(req, res);

    expect(walkRecord.update).toHaveBeenCalledWith({
      status: "finalizado",
    });
    expect(rating.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      msg: "Paseo finalizado",
      error: false,
    });
  });

  // 8. Finalización con ratings válidos (200)
  test("finaliza paseo con ratings válidos", async () => {
    const req = buildReq({
      body: {
        new_status: "finalizado",
        walker_rating: {
          value: 5,
          comment: "Excelente cliente",
        },
        client_rating: {
          value: 4,
          comment: "Buen paseador",
        },
      },
    });
    const res = buildRes();
    
    const walkRecord = mockWalkRecord("en_curso", 100, 1);
    walk.findByPk.mockResolvedValue(walkRecord);
    rating.create.mockResolvedValue({});

    await update_walk_status(req, res);

    expect(walkRecord.update).toHaveBeenCalledWith({
      status: "finalizado",
    });
    expect(rating.create).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Paseo finalizado",
      error: false,
    });
  });

  // 9. Finalización con rating inválido (400)
  test("rechaza finalización con rating inválido", async () => {
    const req = buildReq({
      body: {
        new_status: "finalizado",
        walker_rating: {
          value: 5,
          comment: "", // Comentario vacío
        },
      },
    });
    const res = buildRes();
    
    const walkRecord = mockWalkRecord("en_curso", 100, 1);
    walk.findByPk.mockResolvedValue(walkRecord);

    await update_walk_status(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Comentario obligatorio para rating",
      error: true,
    });
  });

  // 10. Error interno del servidor (500)
  test("retorna 500 si ocurre un error inesperado", async () => {
    const originalConsole = console.error;
    console.error = jest.fn();

    const req = buildReq();
    const res = buildRes();
    
    walk.findByPk.mockRejectedValue(new Error("Error de base de datos"));

    await update_walk_status(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Error al actualizar el estado del paseo",
      error: true,
    });

    console.error = originalConsole;
  });
});