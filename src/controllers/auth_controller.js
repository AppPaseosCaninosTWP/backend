require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const validator = require("validator");
const crypto = require("crypto");
const { user } = require("../models/database");
const { Op } = require("sequelize");
const { send_email } = require("../utils/email/email_service");
const { send_sms } = require("../utils/send_sms_service"); 

// ————————————————
// Inicio de sesión
// ————————————————
const login_user = async (req, res) => {
  try {
    // 1) Sanitizar inputs
    let { email, password } = req.body;
    email = validator.trim(email);
    password = validator.trim(password);

    // 2) Validaciones

    // Campos obligatorios
    if (!email || !password) {
      return res.status(400).json({
        msg: "Email y contraseña son obligatorios",
        data: null,
        error: true,
      });
    }

    // Formato de email
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        msg: "Correo electrónico inválido",
        data: null,
        error: true,
      });
    }

    // 3) Verificar existencia de usuario
    const user_ = await user.findOne({
      where: { email },
      include: { association: "role" },
    });
    if (!user_) {
      return res.status(404).json({
        msg: "Las credenciales de acceso son incorrectas o el usuario no está registrado.",
        data: null,
        error: true,
      });
    }

    // 4) Verificar que el usuario esté habilitado
    if (!user_.is_enable) {
      return res.status(403).json({
        msg: "Usuario deshabilitado. Contacte soporte.",
        data: null,
        error: true,
      });
    }

    // 5) Verificar contraseña
    const valid_password = await bcrypt.compare(password, user_.password);
    if (!valid_password) {
      return res.status(401).json({
        msg: "Las credenciales de acceso son incorrectas o el usuario no está registrado.",
        data: null,
        error: true,
      });
    }

    // 6) Generar JWT
    const token = jwt.sign(
      { user_id: user_.user_id, role_id: user_.role_id },
      process.env.JWT_SECRET,
      { expiresIn: "4h" }
    );

    // 7) Responder con datos y token
    return res.json({
      msg: "Inicio de sesión exitoso",
      data: {
        user: {
          user_id: user_.user_id,
          email: user_.email,
          phone: user_.phone,
          role: user_.role ? user_.role.name : null,
        },
        token,
      },
      error: false,
    });
  } catch (err) {
    console.error("Error en login_user:", err);
    return res.status(500).json({
      msg: "Error en el servidor",
      data: null,
      error: true,
    });
  }
};

/**
 * Registro preliminar SIN guardar en DB hasta verificar SMS.
 * Genera un JWT temporal (pending_verification_token) con:
 *   { name, email, phone, hashed_password, verification_code }
 * y lo devuelve al cliente. Envía el SMS con el código.
 */
const register_user = async (req, res) => {
  try {
    // 1) Recuperar y normalizar campos (snake_case)
    let { name, email, phone, password, confirm_password } = req.body;
    name             = validator.trim(name);
    email            = validator.trim(email);
    phone            = validator.trim(phone);
    password         = validator.trim(password);
    confirm_password = validator.trim(confirm_password);

    // 2) Validaciones básicas
    if (!name || name.length === 0 || name.length > 50) {
      return res.status(400).json({
        error: true,
        msg: "El nombre es obligatorio y debe tener máximo 50 caracteres",
      });
    }
    if (!email || !phone || !password || !confirm_password) {
      return res
        .status(400)
        .json({ error: true, msg: "Todos los campos son obligatorios" });
    }
    if (!validator.isEmail(email)) {
      return res
        .status(400)
        .json({ error: true, msg: "Su correo electrónico no es válido" });
    }
    // Formato chileno: 9 dígitos (sin espacios ni signos)
    if (!/^\d{9}$/.test(phone)) {
      return res
        .status(400)
        .json({ error: true, msg: "Teléfono móvil ingresado no válido" });
    }
    if (password.length < 8 || password.length > 15) {
      return res.status(400).json({
        error: true,
        msg: "El largo de la contraseña debe estar entre 8 y 15 caracteres",
      });
    }
    if (/\s/.test(password)) {
      return res
        .status(400)
        .json({ error: true, msg: "La contraseña no puede contener espacios" });
    }
    if (password !== confirm_password) {
      return res
        .status(400)
        .json({ error: true, msg: "Las contraseñas no coinciden" });
    }

    // 3) Comprobar que no exista un usuario real con ese email o phone
    const exists_in_users = await user.findOne({
      where: { [Op.or]: [{ email }, { phone }] },
    });
    if (exists_in_users) {
      return res
        .status(400)
        .json({ error: true, msg: "Email o teléfono ya registrado" });
    }

    // 4) Hashear contraseña
    const hashed_password = await bcrypt.hash(password, 10);

    // 5) Generar código de verificación de 4 dígitos
    const verification_code = Math.floor(1000 + Math.random() * 9000).toString();

    // 6) Crear token JWT temporal con payload { name, email, phone, hashed_password, verification_code }
    //    y expiración de 15 minutos
    const payload = {
      name,
      email,
      phone,
      hashed_password,
      verification_code,
    };
    const pending_verification_token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // 7) Enviar el código por SMS
    const sms_text = `Tu código de verificación es: ${verification_code}`;
    const to_number = "+56" + phone; // Asumimos que "phone" viene sin prefijo "+56"
    await send_sms(to_number, sms_text);

    // 8) Devolver al cliente el pending_verification_token
    return res.status(200).json({
      error: false,
      msg: "Registro preliminar creado. Ingresa el código recibido en tu teléfono para confirmar tu cuenta.",
      data: {
        pending_verification_token,
      },
    });
  } catch (err) {
    console.error("Error en register_user:", err);
    return res.status(500).json({ error: true, msg: "Error en el servidor" });
  }
};

/**
 * Verificar código telefónico sin tabla intermedia.
 * Recibe { pending_verification_token, code } en el body.
 * Si coincide y no expiró, crea el usuario real en User (is_enable=true) y
 * devuelve el token de sesión.
 */
const verify_phone = async (req, res) => {
  try {
    const { pending_verification_token, code } = req.body;

    // 1) Validar que lleguen ambos parámetros
    if (!pending_verification_token || !code) {
      return res
        .status(400)
        .json({ error: true, msg: "pending_verification_token y código son obligatorios" });
    }

    // 2) Decodificar y verificar el JWT
    let decoded;
    try {
      decoded = jwt.verify(pending_verification_token, process.env.JWT_SECRET);
    } catch (err) {
      return res
        .status(400)
        .json({ error: true, msg: "Token inválido o expirado. Debes registrarte de nuevo." });
    }

    // 3) Comparar código
    if (decoded.verification_code !== code) {
      return res
        .status(400)
        .json({ error: true, msg: "Código inválido" });
    }

    // 4) Verificar nuevamente que no exista un usuario real con el mismo email o phone
    const exists_in_users = await user.findOne({
      where: { [Op.or]: [{ email: decoded.email }, { phone: decoded.phone }] },
    });
    if (exists_in_users) {
      return res.status(400).json({
        error: true,
        msg: "Email o teléfono ya registrado.",
      });
    }

    // 5) Crear el usuario real en la tabla User, con is_enable = true
    const new_user = await user.create({
      name: decoded.name,
      email: decoded.email,
      phone: decoded.phone,
      password: decoded.hashed_password,
      is_enable: true,
      // role_id se asigna según tu lógica por defecto, por ejemplo
      // role_id: 3  // o el id del rol “Cliente”
    });

    // 6) Generar JWT de sesión (por ejemplo, 4 horas)
    const session_payload = {
      user_id: new_user.user_id,
      role_id: new_user.role_id,
    };
    const session_token = jwt.sign(
      session_payload,
      process.env.JWT_SECRET,
      { expiresIn: "4h" }
    );

    // 7) (Opcional) Puedes enviar un SMS o email de confirmación final aquí

    // 8) Responder con datos de usuario + token de sesión
    return res.json({
      error: false,
      msg: "Usuario validado y cuenta activada correctamente",
      data: {
        user: {
          user_id: new_user.user_id,
          email: new_user.email,
          phone: new_user.phone,
          role: new_user.role ? new_user.role.name : null,
        },
        token: session_token,
      },
    });
  } catch (err) {
    console.error("Error en verify_phone:", err);
    return res.status(500).json({ error: true, msg: "Error en el servidor" });
  }
};

const request_password_reset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !validator.isEmail(email)) {
      return res
        .status(400)
        .json({ msg: "Email inválido u obligatorio", error: true });
    }

    const account = await user.findOne({ where: { email } });

    if (!account) {
      return res
        .status(404)
        .json({ msg: "El correo no se encuentra en el sistema", error: true });
    }

    const code = crypto.randomInt(100000, 999999).toString();
    account.reset_code = code;
    account.reset_code_expires = new Date(Date.now() + 15 * 60 * 1000);
    await account.save();

    await send_email(
      email,
      "Código para restablecer contraseña",
      `Tu código es ${code}. Expira en 15 minutos.`
    );

    return res.json({ msg: "Código enviado a tu correo", error: false });
  } catch (err) {
    return res.status(500).json({ msg: "Error en el servidor", error: true });
  }
};

const request_reset_code = async (req, res) => {
  try {
    const { email } = req.body;

    const found_user = await user.findOne({ where: { email } });

    if (!found_user) {
      return res.status(404).json({ msg: "correo no encontrado", error: true });
    }

    // Generar código de 5 dígitos
    const reset_code = Math.floor(10000 + Math.random() * 90000).toString();
    const expires_in = new Date(Date.now() + 15 * 60000); // 15 minutos desde ahora

    // Guardar código y expiración en DB
    await found_user.update({
      reset_code,
      reset_code_expires: expires_in,
    });

    await send_email(
      email,
      "Código de recuperación - TWP",
      `Tu código de recuperación es: ${reset_code}. Este código expira en 15 minutos.`
    );

    res.json({ msg: "código enviado exitosamente", error: false });
  } catch (error) {
    console.error("error en request_reset_code:", error);
    res.status(500).json({ msg: "error en el servidor", error: true });
  }
};

const reset_password = async (req, res) => {
  try {
    const { email, code, password, confirm_password } = req.body;

    // 1) Validaciones básicas
    if (
      !email ||
      !code ||
      !password ||
      !confirm_password ||
      !validator.isEmail(email) ||
      password !== confirm_password ||
      password.length < 8 ||
      password.length > 15
    ) {
      return res
        .status(400)
        .json({ msg: "Datos inválidos u obligatorios", error: true });
    }

    // 2) Buscar cuenta y comprobar código + expiración
    const account = await user.findOne({ where: { email } });
    if (
      !account ||
      account.reset_code !== code ||
      !account.reset_code_expires ||
      new Date() > account.reset_code_expires
    ) {
      return res
        .status(400)
        .json({ msg: "Código inválido o expirado", error: true });
    }

    // 3) Hashear y guardar nueva contraseña
    account.password = await bcrypt.hash(password, 10);
    account.reset_code = null;
    account.reset_code_expires = null;
    await account.save();

    // 4) Notificar al usuario
    await send_email(
      email,
      "Contraseña restablecida",
      "Tu contraseña ha sido cambiada correctamente."
    );

    return res.json({
      msg: "Contraseña restablecida. Inicia sesión con la nueva contraseña",
      error: false,
    });
  } catch (err) {
    console.error("Error en reset_password:", err);
    return res.status(500).json({ msg: "Error en el servidor", error: true });
  }
};

module.exports = {
  login_user,
  register_user,
  verify_phone,
  request_password_reset,
  reset_password,
};
