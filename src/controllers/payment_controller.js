const { payment, user, walk } = require("../models/database");
const { Op } = require("sequelize");

const update_payment_status = async (req, res) => {
  const { id } = req.params;
  const { new_status } = req.body;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ msg: "ID de pago inválido", error: true });
  }

  try {
    const payment_record = await payment.findByPk(id, {
      include: [{ model: walk, as: "walk" }],
    });

    if (!payment_record) {
      return res.status(404).json({ msg: "Pago no encontrado", error: true });
    }

    const { role_id, user_id } = req.user;
    const is_owner = payment_record.walk?.client_id === user_id;

    if (role_id !== 1 && role_id !== 3) {
      return res
        .status(403)
        .json({
          msg: "No tienes permiso para modificar este pago",
          error: true,
        });
    }

    if (role_id === 3 && !is_owner) {
      return res
        .status(403)
        .json({ msg: "No puedes modificar pagos que no creaste", error: true });
    }

    await payment_record.update({ status: new_status });

    return res.json({ msg: "Estado del pago actualizado", error: false });
  } catch (err) {
    console.error("Error en update_payment_status:", err);
    return res
      .status(500)
      .json({ msg: "Error al actualizar el estado del pago", error: true });
  }
};

const get_all_payments = async (req, res) => {
  const { role_id, user_id } = req.user;

  try {
    let condition = {};
    if (role_id === 3) {
      condition = {
        "$walk.client_id$": user_id,
      };
    } else if (role_id === 2) {
      condition = {
        "$walk.walker_id$": user_id,
      };
    }

    const payments = await payment.findAll({
      where: condition,
      include: [
        {
          model: walk,
          as: "walk",
          include: [
            { model: user, as: "client", attributes: ["email"] },
            { model: user, as: "walker", attributes: ["email"] },
          ],
        },
      ],
    });

    return res.json({ msg: "Pagos obtenidos", data: payments, error: false });
  } catch (err) {
    console.error("Error en get_all_payments:", err);
    return res
      .status(500)
      .json({ msg: "Error al obtener los pagos", error: true });
  }
};

const get_payment_by_id = async (req, res) => {
  const { id } = req.params;
  const { user_id, role_id } = req.user;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ msg: "ID de pago inválido", error: true });
  }

  try {
    const payment_record = await payment.findByPk(id, {
      include: [
        {
          model: walk,
          as: "walk",
          include: [
            { model: user, as: "client", attributes: ["email"] },
            { model: user, as: "walker", attributes: ["email"] },
          ],
        },
      ],
    });

    if (!payment_record) {
      return res.status(404).json({ msg: "Pago no encontrado", error: true });
    }

    const is_owner = payment_record.walk?.client_id === user_id;
    const is_walker = payment_record.walk?.walker_id === user_id;

    const can_access = role_id === 1 || is_owner || is_walker;

    if (!can_access) {
      return res
        .status(403)
        .json({ msg: "No tienes permiso para ver este pago", error: true });
    }

    return res.json({
      msg: "Pago obtenido",
      data: payment_record,
      error: false,
    });
  } catch (err) {
    console.error("Error en get_payment_by_id:", err);
    return res
      .status(500)
      .json({ msg: "Error al obtener el pago", error: true });
  }
};

module.exports = {
  update_payment_status,
  get_all_payments,
  get_payment_by_id,
};
