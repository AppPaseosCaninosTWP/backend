/**
 * @file walker_profile_controller.js
 * @module mod1 - Gestión de Usuarios
 * @description Pruebas unitarias para la función `update_walker_profile`
 *
 * Casos de prueba cubiertos:
 * 1. Acceso denegado si no es paseador (403)
 * 2. Perfil no encontrado o id no coincide (404)
 * 3. Actualización exitosa (200)
 * 4. Error interno del servidor (500)
 *
 * Basado en: ERS v2.7 – Requerimiento CRED-007 y CRED-008
 */

const path = require("path");
const fs = require("fs");
const { update_walker_profile } = require("../../../../controllers/walker_profile_controller");
const { walker_profile } = require("../../../../models/database");

jest.mock("../../../../models/database", () => ({
  walker_profile: { findByPk: jest.fn() },
}));

describe("update_walker_profile", () => {
  const buildReq = ({ id = "7", roleId = 2, userId = 7, file = null, body = {} } = {}) => ({
    params: { id },
    user: { role_id: roleId, user_id: userId },
    file,
    body,
  });

  const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("1. Acceso denegado si no es paseador (403)", async () => {
    const req = buildReq({ roleId: 3 });
    const res = buildRes();

    await update_walker_profile(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ msg: "Acceso denegado", error: true });
  });

  test("2. Perfil no encontrado o id no coincide (404)", async () => {
    walker_profile.findByPk.mockResolvedValue(null);

    const req = buildReq({ id: "10", roleId: 2, userId: 7 });
    const res = buildRes();

    await update_walker_profile(req, res);

    expect(walker_profile.findByPk).toHaveBeenCalledWith("10");
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ msg: "Perfil no encontrado", error: true });
  });

  test("3. Actualización exitosa (200)", async () => {
    const mockProfile = {
      walker_id: 7,
      pending_changes: {},
      update_requested: false,
      save: jest.fn().mockResolvedValue(),
    };
    walker_profile.findByPk.mockResolvedValue(mockProfile);

    jest.spyOn(fs, "renameSync").mockImplementation(() => {});

    const req = buildReq({
      id: "7",
      roleId: 2,
      userId: 7,
      file: { originalname: "photo.PNG", filename: "file123" },
      body: { experience: "4", email: "x@example.com" },
    });
    const res = buildRes();

    await update_walker_profile(req, res);

    // Verifica que renameSync fue llamado correctamente
    expect(fs.renameSync).toHaveBeenCalledWith(
      expect.stringContaining("file123"),
      expect.stringContaining("file123.png")
    );

    // Verifica que los cambios pendientes se asignaron
    expect(mockProfile.pending_changes).toEqual({
      photo: "file123.png",
      experience: "4",
      email: "x@example.com",
    });
    expect(mockProfile.update_requested).toBe(true);
    expect(mockProfile.save).toHaveBeenCalled();

    // Verifica la respuesta JSON
    expect(res.json).toHaveBeenCalledWith({
      msg: "Solicitud de cambio enviada. Pendiente de aprobación",
      data: { walker_id: 7 },
      error: false,
    });

    fs.renameSync.mockRestore();
  });

  test("4. Error interno del servidor (500)", async () => {
    const originalConsole = console.error;
    console.error = jest.fn();

    walker_profile.findByPk.mockRejectedValue(new Error("DB fail"));

    const req = buildReq();
    const res = buildRes();

    await update_walker_profile(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ msg: "Error en el servidor", error: true });

    console.error = originalConsole;
  });
});