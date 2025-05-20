// src/utils/notification_service.js

/**
 * @param {number} userId  El ID del usuario que recibe la notificación
 * @param {{ title: string, body: string }} payload
 */
async function sendNotification(userId, payload) {
  console.log(`🏷  Notificación para ${userId}:`, payload);
}
module.exports = { sendNotification };
