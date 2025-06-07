/**
 * @file register_user.test.js
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