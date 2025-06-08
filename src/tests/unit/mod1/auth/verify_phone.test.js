/**
 * @file auth_controller.js
 * @module mod1 - Gestión de Usuarios
 * @description Pruebas unitarias para la función `verify_phone`
 *
 * Casos de prueba cubiertos:
 * 1. Parámetros faltantes (400)
 * 2. Token inválido o expirado (400)
 * 3. Código incorrecto (400)
 * 4. Email o teléfono ya registrado (400)
 * 5. Verificación exitosa (200)
 * 6. Error interno del servidor (500)
 *
 * Basado en: ERS v2.7 - Requerimiento CRED-004
 */

const { verify_phone } = require("../../../../controllers/auth_controller");
const jwt = require("jsonwebtoken");
const { user: User } = require("../../../../models/database");
const { Op } = require("sequelize");

// Mocks
jest.mock("../../../../models/database", () => ({
  user: {
    findOne: jest.fn(),
    create:  jest.fn(),
  },
}));
jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
  sign:   jest.fn(),
}));

describe("verify_phone", () => {
  let _origError;
  let _origWarn;

  beforeAll(() => {
    // Silenciar errores y warnings
    _origError = console.error;
    console.error = jest.fn();
    _origWarn = console.warn;
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.error = _origError;
    console.warn = _origWarn;
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

  test("1. Parámetros faltantes (400)", async () => {
    const req = { body: {} };
    const res = buildRes();

    await verify_phone(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg:   "pending_verification_token y código son obligatorios",
    });
  });

  test("2. Token inválido o expirado (400)", async () => {
    const req = { body: { pending_verification_token: "tok", code: "1234" } };
    const res = buildRes();
    jwt.verify.mockImplementation(() => { throw new Error("fail"); });

    await verify_phone(req, res);

    expect(jwt.verify).toHaveBeenCalledWith("tok", process.env.JWT_SECRET);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg:   "Token inválido o expirado. Debes registrarte de nuevo.",
    });
  });

  test("3. Código incorrecto (400)", async () => {
    const decoded = {
      verification_code: "1111",
      email:             "a@b",
      phone:             "123",
      name:              "X",
      hashed_password:   "h",
    };
    const req = { body: { pending_verification_token: "tok", code: "2222" } };
    const res = buildRes();
    jwt.verify.mockReturnValue(decoded);

    await verify_phone(req, res);

    expect(jwt.verify).toHaveBeenCalledWith("tok", process.env.JWT_SECRET);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg:   "Código inválido",
    });
  });

  test("4. Email o teléfono ya registrado (400)", async () => {
    const decoded = {
      verification_code: "1234",
      email:             "a@b",
      phone:             "123",
      name:              "X",
      hashed_password:   "h",
    };
    const req = { body: { pending_verification_token: "tok", code: "1234" } };
    const res = buildRes();
    jwt.verify.mockReturnValue(decoded);
    // Simulamos que ya existe un usuario con ese email o phone
    User.findOne.mockResolvedValue({ user_id: 55 });

    await verify_phone(req, res);

    expect(User.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          [Op.or]: [
            { email: decoded.email },
            { phone: decoded.phone },
          ],
        },
      })
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg:   "Email o teléfono ya registrado.",
    });
  });

  test("5. Verificación exitosa (200)", async () => {
    const decoded = {
      verification_code: "9999",
      email:             "u@e.cl",
      phone:             "987654321",
      name:              "Nombre",
      hashed_password:   "HASHED",
    };
    const newUser = {
      user_id:  77,
      email:    decoded.email,
      phone:    decoded.phone,
      role_id:  3,
      role:     { name: "Cliente" },
    };
    const req = { body: { pending_verification_token: "tokX", code: "9999" } };
    const res = buildRes();

    jwt.verify.mockReturnValue(decoded);
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue(newUser);
    jwt.sign.mockReturnValue("session_token_ABC");

    await verify_phone(req, res);

    expect(User.create).toHaveBeenCalledWith({
      name:      decoded.name,
      email:     decoded.email,
      phone:     decoded.phone,
      password:  decoded.hashed_password,
      is_enable: true,
      role_id:   3,
    });
    expect(jwt.sign).toHaveBeenCalledWith(
      { user_id: newUser.user_id, role_id: newUser.role_id },
      process.env.JWT_SECRET,
      { expiresIn: "4h" }
    );
    expect(res.json).toHaveBeenCalledWith({
      error: false,
      msg:   "Usuario validado y cuenta activada correctamente",
      data: {
        user: {
          user_id: newUser.user_id,
          email:   newUser.email,
          phone:   newUser.phone,
          role:    newUser.role.name,
        },
        token: "session_token_ABC",
      },
    });
  });

  test("6. Error interno del servidor (500)", async () => {
    const decoded = {
      verification_code: "1234",
      email:             "x@y",
      phone:             "111",
      name:              "N",
      hashed_password:   "h",
    };
    const req = { body: { pending_verification_token: "tok", code: "1234" } };
    const res = buildRes();

    jwt.verify.mockReturnValue(decoded);
    User.findOne.mockRejectedValue(new Error("DB down"));

    await verify_phone(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      msg:   "Error en el servidor",
    });
  });
});