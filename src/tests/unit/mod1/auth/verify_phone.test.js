/**
 * @file auth.controller.js
 * @module mod1 - Gestión de Usuarios
 * @description Pruebas unitarias para la función `verify_phone`
 *
 * Casos de prueba cubiertos:
 * 1. Token o código faltante (400)
 * 2. Token inválido o expirado (400)
 * 3. Código incorrecto (400)
 * 4. Usuario ya existe con ese email o teléfono (400)
 * 5. Verificación exitosa → crea usuario y devuelve token (200)
 * 6. Error interno del servidor (500)
 *
 * Basado en: ERS v2.7 – Requerimiento CRED-004
 */
