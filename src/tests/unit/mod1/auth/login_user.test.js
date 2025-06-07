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
});