const jwt        = require("jsonwebtoken");
const bcrypt     = require("bcryptjs");
const validator  = require("validator");
const crypto     = require("crypto");
const { user }   = require("../models/database");
const { Op }     = require("sequelize");
const { send_email } = require("../utils/email_service");
// ————————————————
// Inicio de sesión
// ————————————————
const login_user = async (req, res) => {
  try {
    // 1) Sanitizar inputs
    let { email, password } = req.body;
    email    = validator.trim(email);
    password = validator.trim(password);

    // 2) Validaciones

    // Campos obligatorios
    if (!email || !password) {
      return res.status(400).json({
        msg:    "Email y contraseña son obligatorios",
        data:   null,
        error:  true
      });
    }

    // Formato de email
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        msg:    "Correo electrónico inválido",
        data:   null,
        error:  true
      });
    }

    // 3) Verificar existencia de usuario
    const user_ = await user.findOne({
      where:     { email },
      include:   { association: "role" }
    });
    if (!user_) {
      return res.status(404).json({
        msg:    "Las credenciales de acceso son incorrectas o el usuario no está registrado.",
        data:   null,
        error:  true
      });
    }

    // 4) Verificar que el usuario esté habilitado
    if (!user_.is_enable) {
      return res.status(403).json({
        msg:    "Usuario deshabilitado. Contacte soporte.",
        data:   null,
        error:  true
      });
    }

    // 5) Verificar contraseña
    const valid_password = await bcrypt.compare(password, user_.password);
    if (!valid_password) {
      return res.status(401).json({
        msg:    "Las credenciales de acceso son incorrectas o el usuario no está registrado.",
        data:   null,
        error:  true
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
      msg:    "Inicio de sesión exitoso",
      data:   {
        user: {
          user_id: user_.user_id,
          email:   user_.email,
          phone:   user_.phone,
          role:    user_.role ? user_.role.name : null
        },
        token
      },
      error:  false
    });
  } catch (err) {
    console.error("Error en login_user:", err);
    return res.status(500).json({
      msg:    "Error en el servidor",
      data:   null,
      error:  true
    });
  }
};

const register_user = async (req, res) => {
  try {
    // 1) Sanitizar inputs
    let { email, phone, password, confirm_password } = req.body;
    email            = validator.trim(email);
    phone            = validator.trim(phone);
    password         = validator.trim(password);
    confirm_password = validator.trim(confirm_password);

    // 2) Validaciones
    if (!email || !phone || !password || !confirm_password) {
      return res.status(400).json({ error: true, msg: 'Todos los campos son obligatorios' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: true, msg: 'Correo electrónico inválido' });
    }
    if (!/^\d{9}$/.test(phone)) {
      return res.status(400).json({ error: true, msg: 'El teléfono debe tener 9 dígitos numéricos' });
    }
    if (password.length < 8 || password.length > 15) {
      return res.status(400).json({ error: true, msg: 'La contraseña debe tener entre 8 y 15 caracteres' });
    }
    // validación “mayúscula + número”:
    // if (!/(?=.*[A-Z])/.test(password) || !/(?=.*\d)/.test(password)) {
    //   return res.status(400).json({
    //     error: true,
    //     msg: 'La contraseña debe incluir al menos una mayúscula y un número'
    //   });
    // }
    if (/\s/.test(password)) {
      return res.status(400).json({ error: true, msg: 'La contraseña no puede contener espacios' });
    }
    if (password !== confirm_password) {
      return res.status(400).json({ error: true, msg: 'Las contraseñas no coinciden' });
    }

    // 3) Unicidad en BD (email o teléfono)
    const existing = await user.findOne({
      where: { [Op.or]: [{ email }, { phone }] }
    });
    if (existing) {
      return res.status(400).json({ error: true, msg: 'Email o teléfono ya registrado' });
    }

    // 4) Hashear y crear
    const hashed = await bcrypt.hash(password, 10);
    const new_user = await user.create({ email, phone, password: hashed });

    // 5) Respuesta
    return res.status(201).json({
      error: false,
      msg: 'Usuario registrado exitosamente',
      data: {
        user_id: new_user.user_id,
        email: new_user.email,
        phone: new_user.phone
      }
    });
  } catch (err) {
    console.error('Error en register_user:', err);
    return res.status(500).json({ error: true, msg: 'Error en el servidor' });
  }
};

const request_password_reset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ msg: "Email inválido u obligatorio", error: true });
    }

    const account = await user.findOne({ where: { email } });

    if (!account) {
      return res.status(404).json({ msg: "El correo no se encuentra en el sistema", error: true });
    }

    const code = crypto.randomInt(100000, 999999).toString();
    account.reset_code         = code;
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
    account.password           = await bcrypt.hash(password, 10);
    account.reset_code         = null;
    account.reset_code_expires = null;
    await account.save();

    // 4) Notificar al usuario
    await send_email(
      email,
      "Contraseña restablecida",
      "Tu contraseña ha sido cambiada correctamente."
    );

    return res.json({
      msg:   "Contraseña restablecida. Inicia sesión con la nueva contraseña",
      error: false
    });
  } catch (err) {
    console.error("Error en reset_password:", err);
    return res.status(500).json({ msg: "Error en el servidor", error: true });
  }
};

module.exports = {
  login_user,
  register_user,
  request_password_reset,
  reset_password,
};
