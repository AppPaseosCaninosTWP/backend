const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { user } = require("../models/database");

const login_user = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar campos obligatorios
    if (!email || !password) {
      return res.status(400).json({
        msg: "Email y contraseña son obligatorios",
        data: null,
        error: true,
      });
    }

    const user_ = await user.findOne({
      where: { email },
      include: { association: "role" },
    });

    // Validar que el usuario exista
    if (!user_) {
      return res.status(404).json({
        msg: "Las credenciales de acceso son incorrectas o el usuario no está registrado.",
        data: null,
        error: true,
      });
    }

    // Validar que el usuario esté habilitado
    if (!user_.is_enable) {
      return res.status(403).json({
        msg: "Usuario deshabilitado. Contacte soporte.",
        data: null,
        error: true,
      });
    }

    // Validar que la contraseña sea correcta
    const valid_password = await bcrypt.compare(password, user_.password);
    if (!valid_password) {
      return res.status(401).json({
        msg: "Las credenciales de acceso son incorrectas o el usuario no está registrado.",
        data: null,
        error: true,
      });
    }

    const token = jwt.sign(
      { user_id: user_.user_id, role_id: user_.role_id },
      process.env.JWT_SECRET,
      { expiresIn: "4h" }
    );

    // Return user data and token
    // El token en el frontend se guardará en el localStorage o sessionStorage
    // y se enviará en el header Authorization para las peticiones a la API
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
    console.error("Error en login:", err);
    return res
      .status(500)
      .json({ msg: "Error en el servidor", data: null, error: true });
  }
};

const register_user = async (req, res) => {
  try {
    const { email, phone, password, confirm_password } = req.body;

    // Validar que todos los campos sean obligatorios
    if (!email || !phone || !password || !confirm_password) {
      return res
        .status(400)
        .json({ msg: "Todos los campos son obligatorios", error: true });
    }

    // Validar formato del correo electrónico
    const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email_regex.test(email)) {
      return res
        .status(400)
        .json({ msg: "Su correo electrónico no es válido", error: true });
    }

    // Validar número de teléfono (9 dígitos)
    if (phone.length !== 9 || isNaN(phone)) {
      return res
        .status(400)
        .json({ msg: "Número de teléfono inválido", error: true });
    }

    // Validar largo de la contraseña
    if (password.length < 8 || password.length > 15) {
      return res.status(400).json({
        msg: "El largo de la contraseña debe estar entre 8 y 15 caracteres",
        error: true,
      });
    }

    // Validar que las contraseñas coincidan
    if (password !== confirm_password) {
      return res
        .status(400)
        .json({ msg: "Las contraseñas no coinciden", error: true });
    }

    // Validar que el correo no esté registrado
    const existing_user = await user.findOne({ where: { email } });
    if (existing_user) {
      return res
        .status(400)
        .json({ msg: "El correo ya está registrado", error: true });
    }

    // Hashear la contraseña
    const hashed_password = await bcrypt.hash(password, 10);

    // Crear el nuevo usuario
    const new_user = await user.create({
      email,
      phone,
      password: hashed_password,
    });

    return res.status(201).json({
      msg: "Usuario registrado exitosamente",
      data: {
        user_id: new_user.user_id,
        email: new_user.email,
        phone: new_user.phone,
      },
      error: false,
    });
  } catch (error) {
    console.error("Error en register_user:", error);
    return res.status(500).json({ msg: "Error en el servidor", error: true });
  }
};

module.exports = {
  login_user,
  register_user,
};
