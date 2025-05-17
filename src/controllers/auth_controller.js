const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { user } = require("../models/database");
const validator = require("validator");
const { Op }    = require("sequelize");

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

module.exports = {
  login_user,
  register_user,
};
