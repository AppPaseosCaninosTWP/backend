/**
 * @file auth_controller.test.js
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