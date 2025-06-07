/**
 * @file auth.controller.js
 * @module mod1 - Gestión de Usuarios
 * @description Pruebas unitarias para la función `login_user`
 *
 * Casos de prueba cubiertos:
 * 1. Email o password no enviados (400)
 * 2. Formato de email inválido (400)
 * 3. Usuario no encontrado (404)
 * 4. Usuario deshabilitado (403)
 * 5. Contraseña incorrecta (401)
 * 6. Login exitoso (200)
 * 7. Error interno del servidor (500)
 *
 * Basado en: ERS v2.7 – Requerimiento CRED-002
 */

const { login_user } = require("../../../../controllers/auth_controller");
const { user } = require("../../../../models/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

jest.mock("../../../../models/database", () => ({
  user: { findOne: jest.fn() },
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("mocked_jwt_token"),
}));

describe("login_user", () => {
  const build_mock_response = () => {
    const response = {};
    response.status = jest.fn().mockReturnValue(response);
    response.json = jest.fn().mockReturnValue(response);
    return response;
  };

  const build_mock_request = (email, password) => ({
    body: { email, password },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Email o password no enviados (400)
  test("retorna 400 si email o password están ausentes", async () => {
    const request = build_mock_request("", "");
    const response = build_mock_response();

    await login_user(request, response);
    
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      msg: "Email y contraseña son obligatorios",
      data: null,
      error: true,
    });
  });

  // 2. Formato de email inválido (400)
  test("retorna 400 si el email tiene formato inválido", async () => {
    const request = build_mock_request("correo@invalido", "Password123");
    const response = build_mock_response();

    await login_user(request, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      msg: "Correo electrónico inválido",
      data: null,
      error: true,
    });
  });

  // 3. Usuario no encontrado (404)
  test("retorna 404 si el usuario no existe", async () => {
    user.findOne.mockResolvedValue(null);

    const request = build_mock_request("test@example.com", "Password123");
    const response = build_mock_response();

    await login_user(request, response);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      msg: "Las credenciales de acceso son incorrectas o el usuario no está registrado.",
      data: null,
      error: true,
    });
  });

  // 4. Usuario deshabilitado (403)
  test("retorna 403 si el usuario está deshabilitado", async () => {
    user.findOne.mockResolvedValue({ is_enable: false });

    const request = build_mock_request("test@example.com", "Password123");
    const response = build_mock_response();

    await login_user(request, response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      msg: "Usuario deshabilitado. Contacte soporte.",
      data: null,
      error: true,
    });
  });

  // 5. Contraseña incorrecta (401)
  test("retorna 401 si la contraseña es incorrecta", async () => {
    user.findOne.mockResolvedValue({
      email: "test@example.com",
      password: "hashed_password",
      is_enable: true,
    });

    bcrypt.compare.mockResolvedValue(false);

    const request = build_mock_request("test@example.com", "wrong_password");
    const response = build_mock_response();

    await login_user(request, response);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      msg: "Las credenciales de acceso son incorrectas o el usuario no está registrado.",
      data: null,
      error: true,
    });
  });

  // 6. Login exitoso (200)
  test("retorna 200 con token y datos si login es exitoso", async () => {
    user.findOne.mockResolvedValue({
      user_id: 1,
      email: "test@example.com",
      phone: "912345678",
      role_id: 2,
      password: "hashed_password",
      is_enable: true,
      role: { name: "Cliente" },
    });

    bcrypt.compare.mockResolvedValue(true);

    const request = build_mock_request("test@example.com", "Password123");
    const response = build_mock_response();

    await login_user(request, response);

    expect(jwt.sign).toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith({
      msg: "Inicio de sesión exitoso",
      data: {
        user: {
          user_id: 1,
          email: "test@example.com",
          phone: "912345678",
          role: "Cliente",
        },
        token: "mocked_jwt_token",
      },
      error: false,
    });
  });

  // 7. Error interno del servidor (500)
  test("retorna 500 si ocurre un error inesperado", async () => {
    const original_console_error = console.error;
    console.error = jest.fn(); // Silenciar temporalmente

    user.findOne.mockRejectedValue(new Error("DB failure"));

    const request = build_mock_request("test@example.com", "Password123");
    const response = build_mock_response();

    await login_user(request, response);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      msg: "Error en el servidor",
      data: null,
      error: true,
    });

    console.error = original_console_error; // Restaurar
  });
});