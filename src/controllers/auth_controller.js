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

    if (!email || !phone || !password || !confirm_password) {
      return res
        .status(400)
        .json({ msg: "Faltan campos obligatorios", error: true });
    }

    if (phone.length !== 9 || isNaN(phone)) {
      return res
        .status(400)
        .json({ msg: "Número de teléfono inválido", error: true });
    }

    if (password !== confirm_password) {
      return res
        .status(400)
        .json({ msg: "Las contraseñas no coinciden", error: true });
    }

    const existing_user = await user.findOne({ where: { email } });
    if (existing_user) {
      return res
        .status(400)
        .json({ msg: "El correo ya está registrado", error: true });
    }

    const hashed_password = await bcrypt.hash(password, 10);

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
