const nodemailer = require("nodemailer");

const send_email = async (to, subject, text_content) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mail_options = {
      from: `"App Paseos Caninos TWP" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: text_content,
    };

    await transporter.sendMail(mail_options);
  } catch (error) {
    console.error("error enviando correo:", error);
    throw new Error("error enviando correo electrónico");
  }
};

module.exports = {
  send_email,
};