/**
 * @file contact_controller.test.js
 * @module mod6 - Mensajes
 * @description Pruebas unitarias para la función `redirect_whatsapp`
 *
 * Casos de prueba cubiertos:
 * 1. Usuario receptor no existe (404)
 * 2. No hay paseo activo entre los usuarios (403)
 * 3. Redirección válida con paseo activo (200)
 * 4. Link generado tiene el formato correcto (https://wa.me/56...)
 * 5. Error interno del servidor (500)
 *
 * Basado en: ERS v2.7 – Requerimiento MSGS-001
 */