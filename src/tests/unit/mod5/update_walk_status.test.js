/**
 * @file walk_controller.js
 * @module mod5 - Calificaciones
 * @description Pruebas unitarias para la función `update_walk_status`
 *
 * Casos de prueba cubiertos:
 * 1. Finalizar paseo sin calificaciones ni comentarios (200)
 * 2. Fallo al proporcionar un rating sin comentario obligatorio (400)
 * 3. Éxito al enviar ratings y comentarios válidos (200)
 * 4. Error interno del servidor (500)
 */

const { update_walk_status } = require("../../../controllers/walk_controller");

// Mockeamos nuestros modelos
jest.mock("../../../models/database", () => ({
  walk:      { findByPk: jest.fn() },
  days_walk: { findOne: jest.fn() },
  rating:    { create: jest.fn() },
}));
const { walk, days_walk, rating } = require("../../../models/database");

describe("update_walk_status", () => {
  const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
  };

  const buildReq = ({ id = 1, body = {}, user = { user_id: 10, role_id: 2 } } = {}) => ({
    params: { id },
    body,
    user,
  });

  beforeEach(() => jest.clearAllMocks());

  test("1. Finalizar paseo sin calificaciones ni comentarios (200)", async () => {
    const fakeWalk = {
      walk_id:    99,
      client_id:  7,
      update:     jest.fn().mockResolvedValue()
    };
    walk.findByPk.mockResolvedValue(fakeWalk);

    const req = buildReq({ body: { new_status: "finalizado" } });
    const res = buildRes();

    await update_walk_status(req, res);

    expect(fakeWalk.update).toHaveBeenCalledWith({ status: "finalizado" });
    expect(rating.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ msg: "Paseo finalizado", error: false });
  });

  test("2. Fallo al proporcionar un rating sin comentario obligatorio (400)", async () => {
    const fakeWalk = {
      walk_id:    99,
      client_id:  7,
      update:     jest.fn()
    };
    walk.findByPk.mockResolvedValue(fakeWalk);

    const req = buildReq({
      body: {
        new_status:    "finalizado",
        walker_rating: { value: 4.5, comment: "" }
      }
    });
    const res = buildRes();

    await update_walk_status(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      msg:   "Comentario obligatorio para rating",
      error: true
    });
    expect(fakeWalk.update).not.toHaveBeenCalled();
    expect(rating.create).not.toHaveBeenCalled();
  });

  test("3. Éxito al enviar ratings y comentarios válidos (200)", async () => {
    const fakeWalk = {
      walk_id:    42,
      client_id:  7,
      update:     jest.fn().mockResolvedValue()
    };
    walk.findByPk.mockResolvedValue(fakeWalk);
    rating.create.mockResolvedValue();

    const req = buildReq({
      body: {
        new_status:     "finalizado",
        walker_rating:  { value: 5, comment: "Excelente servicio" },
        client_rating:  { value: 4, comment: "Muy amable" },
      },
      user: { user_id: 10, role_id: 2 },
    });
    const res = buildRes();

    await update_walk_status(req, res);

    expect(fakeWalk.update).toHaveBeenCalledWith({ status: "finalizado" });
    expect(rating.create).toHaveBeenNthCalledWith(1, {
      value:       5,
      comment:     "Excelente servicio",
      sender_id:   10,
      receiver_id: 7,
      walk_id:     42,
    });
    expect(rating.create).toHaveBeenNthCalledWith(2, {
      value:       4,
      comment:     "Muy amable",
      sender_id:   7,
      receiver_id: 10,
      walk_id:     42,
    });
    expect(res.json).toHaveBeenCalledWith({ msg: "Paseo finalizado", error: false });
  });

  test("4. Error interno del servidor (500)", async () => {
    // Opcional: silenciar console.error para no ensuciar la salida
    const origError = console.error;
    console.error = jest.fn();

    walk.findByPk.mockRejectedValue(new Error("DB crash"));

    const req = buildReq({ body: { new_status: "finalizado" } });
    const res = buildRes();

    await update_walk_status(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg:   "Error al actualizar el estado del paseo",
      error: true
    });

    console.error = origError;
  });
});

