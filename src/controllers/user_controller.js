const bcrypt = require("bcryptjs");
const { user, role } = require("../models/database");

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
  get_users,
  get_user_by_id,
};
