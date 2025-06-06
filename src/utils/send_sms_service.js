// backend/src/utils/send_sms_services.js

require("dotenv").config();

const twilio = require("twilio");

// Leemos variables de entorno
const account_sid = process.env.TWILIO_ACCOUNT_SID;
const auth_token  = process.env.TWILIO_AUTH_TOKEN;
const from_number = process.env.TWILIO_PHONE_NUMBER;

// Solo creamos el cliente Twilio si tenemos un ACCOUNT_SID que empiece con "AC"
let client = null;
if (account_sid && account_sid.startsWith("AC") && auth_token && from_number) {
  client = twilio(account_sid, auth_token);
} else {
  console.warn(
    "[send_sms_services] TWILIO no configurado o inválido. Entrando en modo MOCK."
  );
}

/**
 * Envía un SMS usando Twilio si está configurado, o hace un MOCK imprimiendo en consola.
 * @param {string} to - Número de teléfono completo (ej. "+56912345678").
 * @param {string} message - Texto del SMS.
 * @returns {Promise<object>} - Promesa que resuelve con el resultado de Twilio, o con un objeto simulado en modo MOCK.
 */
async function send_sms(to, message) {
  // Si client es null, significa que no hay credenciales válidas → modo MOCK
  if (!client) {
    console.log(
      `[send_sms_services] MODO MOCK: SMS simulado a ${to} → "${message}"`
    );
    return Promise.resolve({ sid: "mock-sid", to, message });
  }

  // Si llegamos aquí, client está inicializado correctamente
  try {
    const respuesta = await client.messages.create({
      body: message,
      from: from_number,
      to,
    });
    console.log(`[send_sms_services] SMS enviado: SID ${respuesta.sid}`);
    return respuesta;
  } catch (err) {
    console.error("[send_sms_services] Error al enviar SMS:", err);
    throw err;
  }
}

module.exports = {
  send_sms,
};
