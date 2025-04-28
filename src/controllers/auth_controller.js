const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { user } = require("../models/database");

const login_user = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user_ = await user.findOne({
      where: { email },
      include: { association: "role" },
    });

    if (!user_) {
      return res
        .status(404)
        .json({
          msg: "Correo o contraseña incorrectos",
          data: null,
          error: true,
        });
    }

    const valid_password = await bcrypt.compare(password, user_.password);
    if (!valid_password) {
      return res
        .status(401)
        .json({
          msg: "Correo o contraseña incorrectos",
          data: null,
          error: true,
        });
    }

    const token = jwt.sign(
      { user_id: user_.user_id, role_id: user_.role_id },
      process.env.JWT_SECRET,
      { expiresIn: "4h" }
    );

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

module.exports = { login_user };
