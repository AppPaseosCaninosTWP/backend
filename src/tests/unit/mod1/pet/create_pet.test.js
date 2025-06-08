/**
 * @file pet_controller.js
 * @module mod1 - Gestión de Usuarios
 * @description Pruebas unitarias para la función `create_pet`
 *
 * Casos de prueba cubiertos:
 * 1. Campos obligatorios faltantes o vacíos (400)
 * 2. Nombre demasiado largo (400)
 * 3. Edad fuera de rango permitido (400)
 * 4. Zona no válida (400)
 * 5. Creación exitosa de mascota (201)
 * 6. Error interno del servidor (500)
 *
 * Basado en: ERS v2.7 – Requerimiento CRED-005
 */

const { create_pet } = require("../../../../controllers/pet_controller");
const { pet } = require("../../../../models/database");
const fs = require("fs");

jest.mock("../../../../models/database", () => ({
  pet: { create: jest.fn() }
}));

jest.mock("fs", () => ({
  renameSync: jest.fn()
}));

describe("create_pet", () => {
  const build_mock_response = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const build_mock_request = (body = {}, file = {}) => ({
    body,
    user: { user_id: 1 },
    file
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Campos obligatorios faltantes o vacíos (400)
  test("retorna 400 si faltan campos obligatorios", async () => {
    const req = build_mock_request({ name: "", age: "", zone: "" }, null);
    const res = build_mock_response();

    await create_pet(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      msg: 'Los campos nombre, edad, sector y fotografía son obligatorios',
      error: true
    });
  });

  // 2. Nombre demasiado largo (400)
  test("retorna 400 si el nombre es demasiado largo", async () => {
    const req = build_mock_request({ name: "a".repeat(26), age: "5", zone: "norte" }, { filename: "file", originalname: "foto.jpg" });
    const res = build_mock_response();

    await create_pet(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      msg: "El nombre no puede exceder los 25 caracteres",
      error: true
    });
  });

  // 3. Edad fuera de rango permitido (400)
  test("retorna 400 si la edad es inválida", async () => {
    const req = build_mock_request({ name: "Max", age: "-1", zone: "norte" }, { filename: "file", originalname: "foto.jpg" });
    const res = build_mock_response();

    await create_pet(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      msg: "La edad debe ser un número positivo y no mayor a 20 años",
      error: true
    });
  });

  // 4. Zona no válida (400)
  test("retorna 400 si la zona es inválida", async () => {
    const req = build_mock_request({ name: "Max", age: "5", zone: "oeste" }, { filename: "file", originalname: "foto.jpg" });
    const res = build_mock_response();

    await create_pet(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Sector inválido. Opciones: norte, centro, sur",
      error: true
    });
  });

  // 5. Creación exitosa de mascota (201)
  test("retorna 201 si la mascota se crea exitosamente", async () => {
    pet.create.mockResolvedValue({ pet_id: 1, name: "Max" });

    const req = build_mock_request({
      name: "Max",
      age: "5",
      zone: "centro"
    }, { filename: "file", originalname: "foto.jpg" });
    const res = build_mock_response();

    await create_pet(req, res);

    expect(fs.renameSync).toHaveBeenCalled();
    expect(pet.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      msg: "Mascota registrada exitosamente",
      error: false,
      data: expect.objectContaining({ name: "Max" })
    }));
  });

  // 6. Error interno del servidor (500)
  test("retorna 500 si ocurre un error inesperado", async () => {
    const original_console_error = console.error;
    console.error = jest.fn(); // Silenciar temporalmente

    pet.create.mockRejectedValue(new Error("DB error"));

    const req = build_mock_request({
      name: "Max",
      age: "5",
      zone: "centro"
    }, { filename: "file", originalname: "foto.jpg" });
    const res = build_mock_response();

    await create_pet(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Error en el servidor",
      error: true
    });

    console.error = original_console_error; // Restaurar
  });
});
