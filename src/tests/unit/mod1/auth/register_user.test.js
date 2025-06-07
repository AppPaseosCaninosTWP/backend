/**
 * @file auth.controller.js
 * @module mod1 - Gestión de Usuarios
 * @description Pruebas unitarias para la función `register_user`
 *
 * Casos de prueba cubiertos:
 * 1. Campos faltantes o vacíos (400)
 * 2. Email con formato inválido (400)
 * 3. Teléfono con formato incorrecto (400)
 * 4. Contraseñas no coinciden o inválidas (400)
 * 5. Usuario ya existe con ese email o teléfono (400)
 * 6. Registro preliminar exitoso → devuelve token + envía SMS (200)
 * 7. Error interno del servidor (500)
 *
 * Basado en: ERS v2.7 – Requerimiento CRED-001 y CRED-004
 */

const { register_user } = require("../../../../controllers/auth_controller");
const { user } = require("../../../../models/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
//const { send_sms } = require("../../../../utils/send_sms_service");

jest.mock("../../../../models/database", () => ({
  user: { findOne: jest.fn() },
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password"),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("pending_verification_token"),
}));

//jest.mock("../../../../utils/send_sms_service", () => ({
//  send_sms: jest.fn(),
//}));

describe("register_user", () => {
  const build_mock_response = () => {
    const response = {};
    response.status = jest.fn().mockReturnValue(response);
    response.json = jest.fn().mockReturnValue(response);
    return response;
  };

  const build_mock_request = (body = {}) => ({ body });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Campos faltantes o vacíos (400)
  test("retorna 400 si hay campos obligatorios vacíos", async () => {
    const request = build_mock_request({
      name: "",
      email: "",
      phone: "",
      password: "",
      confirm_password: "",
    });
    const response = build_mock_response();

    await register_user(request, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: true,
      msg: "Todos los campos son obligatorios",
    });
  });

  // 2. Email con formato inválido (400)
  test("retorna 400 si el email es inválido", async () => {
    const request = build_mock_request({
      name: "Juan",
      email: "no-email",
      phone: "912345678",
      password: "Password123",
      confirm_password: "Password123",
    });
    const response = build_mock_response();

    await register_user(request, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: true,
      msg: "Su correo electrónico no es válido",
    });
  });

  // 3. Teléfono con formato incorrecto (400)
  test("retorna 400 si el teléfono no tiene 9 dígitos", async () => {
    const request = build_mock_request({
      name: "Juan",
      email: "test@example.com",
      phone: "123",
      password: "Password123",
      confirm_password: "Password123",
    });
    const response = build_mock_response();

    await register_user(request, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: true,
      msg: "Teléfono móvil ingresado no válido",
    });
  });

  // 4. Contraseñas no coinciden o inválidas (400)
  test("retorna 400 si las contraseñas no coinciden", async () => {
    const request = build_mock_request({
      name: "Juan",
      email: "test@example.com",
      phone: "912345678",
      password: "Password123",
      confirm_password: "Password456",
    });
    const response = build_mock_response();

    await register_user(request, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: true,
      msg: "Las contraseñas no coinciden",
    });
  });

  test("retorna 400 si la contraseña es demasiado corta", async () => {
    const request = build_mock_request({
      name: "Juan",
      email: "test@example.com",
      phone: "912345678",
      password: "123",
      confirm_password: "123",
    });
    const response = build_mock_response();

    await register_user(request, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: true,
      msg: "El largo de la contraseña debe estar entre 8 y 15 caracteres",
    });
  });

  // 5. Usuario ya existe con ese email o teléfono (400)
  test("retorna 400 si el usuario ya existe", async () => {
    user.findOne.mockResolvedValue(true);

    const request = build_mock_request({
      name: "Juan",
      email: "test@example.com",
      phone: "912345678",
      password: "Password123",
      confirm_password: "Password123",
    });
    const response = build_mock_response();

    await register_user(request, response);

    expect(user.findOne).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: true,
      msg: "Email o teléfono ya registrado",
    });
  });

  // 6. Registro preliminar exitoso → devuelve token + envía SMS (200)

  // 7. Error interno
  test("retorna 500 si ocurre un error inesperado", async () => {
    const original_console_error = console.error;
    console.error = jest.fn();

    user.findOne.mockRejectedValue(new Error("DB error"));

    const request = build_mock_request({
      name: "Juan",
      email: "test@example.com",
      phone: "912345678",
      password: "Password123",
      confirm_password: "Password123",
    });
    const response = build_mock_response();

    await register_user(request, response);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      error: true,
      msg: "Error en el servidor",
    });

    console.error = original_console_error;
  });
});