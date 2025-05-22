const bcrypt = require("bcryptjs");
const { user, role } = require("../models/database");
const { send_email } = require("../utils/email_service");

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
      msg: "usuarios obtenidos exitosamente",
      data: rows.map((u) => ({
        user_id: u.user_id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        is_enable: u.is_enable,
        ticket: u.ticket,
        role_id: u.role_id,
        role_name: u.role?.name || null,
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

    const found_user = await user.findByPk(id, {
      include: { model: role, as: "role" },
    });

    if (!found_user) {
      return res.status(404).json({ msg: "usuario no encontrado", error: true });
    }

    return res.json({
      msg: "usuario encontrado exitosamente",
      data: {
        user_id: found_user.user_id,
        email: found_user.email,
        phone: found_user.phone,
        is_enable: found_user.is_enable,
        ticket: found_user.ticket,
        role_id: found_user.role_id,
        role_name: found_user.role?.name || null,
      },
      error: false,
    });
  } catch (error) {
    console.error("error en get_user_by_id:", error);
    return res.status(500).json({ msg: "error en el servidor", error: true });
  }
};

const update_is_enable = async (req, res) => {
  try {
    // 1) Solo admin (role_id = 1)
    if (req.user.role_id !== 1) {
      return res
        .status(403)
        .json({ msg: "Acción no permitida: solo administradores", error: true });
    }

    const { id } = req.params;
    let { is_enable } = req.body;

    // 2) Normalizar input a booleano
    // Acepta true, "true", 1, "1" => true; false, "false", 0, "0" => false
    const truthy = [true, "true", 1, "1"];
    const falsy  = [false, "false", 0, "0"];

    if (truthy.includes(is_enable)) {
      is_enable = true;
    } else if (falsy.includes(is_enable)) {
      is_enable = false;
    } else {
      return res
        .status(400)
        .json({ msg: "El campo is_enable debe ser true/false o 1/0", error: true });
    }

    // 3) Buscar usuario
    const found_user = await user.findByPk(id);
    if (!found_user) {
      return res
        .status(404)
        .json({ msg: "Usuario no encontrado", error: true });
    }

    // 4) Solo roles 2 y 3
    if (![2, 3].includes(found_user.role_id)) {
      return res
        .status(403)
        .json({ msg: "No puedes modificar el estado de este rol", error: true });
    }

    // 5) Aplicar y guardar
    found_user.is_enable = is_enable;
    await found_user.save();

    return res.json({
      msg: `Usuario ${is_enable ? "habilitado" : "deshabilitado"} correctamente`,
      data: { user_id: found_user.user_id, is_enable: found_user.is_enable },
      error: false
    });

  } catch (err) {
    console.error("error en update_is_enable:", err);
    return res
      .status(500)
      .json({ msg: "Error en el servidor", error: true });
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

module.exports = {
  get_users,
  get_user_by_id,
  update_is_enable,
  request_reset_code,
};
