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

const update_is_enable = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_enable } = req.body;

    const found_user = await user.findByPk(id);

    if (!found_user) {
      return res
        .status(404)
        .json({ msg: "usuario no encontrado", error: true });
    }

    if (found_user.role_id !== 2 && found_user.role_id !== 3) {
      return res
        .status(403)
        .json({ msg: "acción no permitida para este rol", error: true });
    }

    await user.update({ is_enable }, { where: { user_id: id } });

    res.json({
      msg: "estado de usuario actualizado correctamente",
      data: { id, is_enable },
      error: false,
    });
  } catch (err) {
    console.error("error en update_is_enable:", err);
    res.status(500).json({ msg: "error en el servidor", error: true });
  }
};

module.exports = {
  get_users,
  get_user_by_id,
  update_is_enable,
};
