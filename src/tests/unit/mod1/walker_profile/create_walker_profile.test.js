/**
 * @file walker_profile_controller.js
 * @module mod1 - Gestión de Usuarios
 * @description Pruebas unitarias para la función `create_walker_profile`
 *
 * Casos de prueba cubiertos:
 * 1. Campos faltantes o inválidos (400)
 * 2. Perfil ya existente (400)
 * 3. Creación exitosa (201)
 * 4. Error interno del servidor (500)
 *
 * Basado en: ERS v2.7 - Requerimiento CRED-008
 */

const { create_walker_profile } = require("../../../../controllers/walker_profile_controller");
const { user, walker_profile } = require("../../../../models/database");
const bcrypt = require("bcryptjs");
const fs = require("fs");

jest.mock("../../../../models/database", () => ({
  user: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  walker_profile: {
    create: jest.fn(),
  },
}));

describe("create_walker_profile", () => {
  const buildReq = (overrides = {}) => ({
    body: {
      name: "Test User",
      email: "test@example.com",
      phone: "123456789",
      password: "password1",
      confirm_password: "password1",
      experience: "5",
      walker_type: "fijo",
      zone: "norte",
      description: "Una descripción válida",
      ...overrides.body,
    },
    file: overrides.file || { originalname: "foto.png", filename: "tmp123" },
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

  // 1. Campos faltantes o inválidos (400)
  test("retorna 400 si falta el nombre", async () => {
    const req = buildReq({ body: { name: "" }, file: null });
    const res = buildRes();

    await create_walker_profile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg: "El nombre es obligatorio y ≤50 caracteres",
    });
  });

  // 2. Perfil ya existente (400)
  test("retorna 400 si el email o teléfono ya está registrado", async () => {
    user.findOne.mockResolvedValue({});

    const req = buildReq();
    const res = buildRes();

    await create_walker_profile(req, res);

    expect(user.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.any(Object),
    }));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg: "Email o teléfono ya registrado",
    });
  });

  // 3. Creación exitosa (201)
  test("retorna 201 y datos de usuario y perfil al crear correctamente", async () => {
    user.findOne.mockResolvedValue(null);
    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashedPassword");
    const newUser = { user_id: 10, name: "Test User", email: "test@example.com", phone: "123456789", role_id: 2 };
    user.create.mockResolvedValue(newUser);
    const profile = {
      walker_id:   10,
      experience:  5,
      walker_type: "Fijo",
      zone:        "Norte",
      photo:       "tmp123.png",
      description: "Una descripción válida",
    };
    walker_profile.create.mockResolvedValue(profile);
    jest.spyOn(fs, "renameSync").mockImplementation(() => {});

    const req = buildReq();
    const res = buildRes();

    await create_walker_profile(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      error: false,
      msg: "Paseador registrado correctamente",
      data: { user: newUser, profile },
    });
    // Verificar que renombró la foto
    expect(fs.renameSync).toHaveBeenCalledWith(
      expect.stringContaining("tmp123"),
      expect.stringContaining("tmp123.png")
    );
    // Verificar creación de perfil con walker_id correcto
    expect(walker_profile.create).toHaveBeenCalledWith(
      expect.objectContaining({ walker_id: newUser.user_id })
    );
  });

  // 4. Error interno del servidor (500)
  test("retorna 500 si ocurre un error inesperado", async () => {
    // Silenciar console.error sólo para este test
    const originalConsole = console.error;
    console.error = jest.fn();

    user.findOne.mockRejectedValue(new Error("DB crash"));

    const req = buildReq();
    const res = buildRes();

    await create_walker_profile(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg: "Error de servidor",
    });

    // Restaurar console.error
    console.error = originalConsole;
  });
});
