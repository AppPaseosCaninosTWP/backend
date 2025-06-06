const nodemailer = require("nodemailer");

const send_email = async (to, subject, text_content) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mail_options = {
      from: `"App Paseos Caninos TWP" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: text_content,
    };

    // Verificación de conexión
    await transporter.verify();
    console.log('Conexión con el servidor SMTP verificada');

    const info = await transporter.sendMail(mail_options);
    console.log('Correo enviado: %s', info.messageId);
    
  } catch (error) {
    console.error("Error detallado:", {
      error: error.message,
      response: error.response,
      stack: error.stack
    });
    throw new Error(`Error al enviar correo: ${error.message}`);
  }
};

module.exports = { send_email };