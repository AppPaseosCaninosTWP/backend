const bcrypt = require("bcryptjs");
const { user, role } = require("../models/database");

const create_user = async (req, res) => {
  try {
    const { email, phone, password, confirm_password} = req.body;

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
    console.error("Error en create_user:", error);
    return res.status(500).json({ msg: "Error en el servidor", error: true });
  }
};

const get_users = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await user.findAndCountAll({
      include: { model: role, as: "role" },
      limit,
      offset,
    });

    return res.json({
      msg: "Usuarios obtenidos exitosamente",
      data: rows.map((u) => ({
        user_id: u.user_id,
        email: u.email,
        phone: u.phone,
        role: u.role?.name || null,
      })),
      total: count,
      page,
      limit,
      error: false,
    });
  } catch (error) {
    console.error("Error en get_users:", error);
    return res.status(500).json({ msg: "Error en el servidor", error: true });
  }
};

const get_user_by_id = async (req, res) => {
  try {
    const { id } = req.params;

    const user_ = await user.findByPk(id, {
      include: { model: role, as: "role" },
    });

    if (!user_) {
      return res
        .status(404)
        .json({ msg: "Usuario no encontrado", error: true });
    }

    return res.json({
      msg: "Usuario encontrado exitosamente",
      data: {
        user_id: user_.user_id,
        email: user_.email,
        phone: user_.phone,
        role: user_.role?.name || null,
      },
      error: false,
    });
  } catch (error) {
    console.error("Error en get_user_by_id:", error);
    return res.status(500).json({ msg: "Error en el servidor", error: true });
  }
};

module.exports = {
  create_user,
  get_users,
  get_user_by_id,
};
