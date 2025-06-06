const { payment, user, walk } = require("../models/database");
const { Op } = require("sequelize");
const { send_payment_receipt, send_payment_notification_to_walker } = require("../utils/mail_service_payment");
const { assign } = require("nodemailer/lib/shared");

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
      return res.status(403).json({ msg: "No tienes permiso para modificar este pago", error: true });
    }

    if (role_id === 3 && !is_owner) {
      return res.status(403).json({ msg: "No puedes modificar pagos que no creaste", error: true });
    }

    await payment_record.update({ status: new_status });

    return res.json({ msg: "Estado del pago actualizado", error: false });
  } catch (err) {
    console.error("Error en update_payment_status:", err);
    return res.status(500).json({ msg: "Error al actualizar el estado del pago", error: true });
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
    return res.status(500).json({ msg: "Error al obtener los pagos", error: true });
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
      return res.status(403).json({ msg: "No tienes permiso para ver este pago", error: true });
    }

    return res.json({ msg: "Pago obtenido", data: payment_record, error: false });
  } catch (err) {
    console.error("Error en get_payment_by_id:", err);
    return res.status(500).json({ msg: "Error al obtener el pago", error: true });
  }
};

const generate_payment_receipt = async (req, res) => {
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
            { model: user, as: "client", attributes: ["id", "email", "name"] },
            { model: user, as: "walker", attributes: ["id", "email", "name"] },
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
      return res.status(403).json({ msg: "No tienes permiso para generar este comprobante", error: true });
    }

    if( payment_record.status !== "confirmado") {
      return res.status(400).json({ msg: "Solo se pueden generar comprobantes para pagos confirmados", error: true });
    }

    const receipt_data = {
      payment_id: payment_record.id,
      walk_id: payment_record.walk.id,
      amount: payment_record.amount,
      status: payment_record.status,
      payment_date: payment_record.payment_date,
      client_email: payment_record.walk.client.email,
      client_name: payment_record.walk.client.name,
      walker_email: payment_record.walk.walker.email,
      walker_name: payment_record.walk.walker.name,
      walk_duration: payment_record.walk.duration,
      walk_date: payment_record.walk.date,
    };

    await send_payment_receipt(receipt_data);

    return res.json({
      msg: "Comprobante de pago generado y enviado por correo electrónico",
      error: false,
      data: { receipt_send_to: receipt_data.client_email}
    });

  }catch (err) {
    console.error("Error en generate_payment_receipt:", err);
    return res.status(500).json({ msg: "Error al generar el comprobante de pago", error: true });
  }
};

const assing_payment_to_walker = async (req, res) => {
  const { id } = req.params;
  const { user_id, role_id } = req.user;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ msg: "ID de pago inválido", error: true });
  }
  try{
    const payment_record = await payment.findByPk(id, {
      include: [
        {
          model: walk,
          as: "walk",
          include: [
            { model: user, as: "client", attributes: ["id", "email", "name"] },
            { model: user, as: "walker", attributes: ["id", "email", "name"] },
          ],
        },
      ],
    });

    if (!payment_record) {
      return res.status(404).json({ msg: "Pago no encontrado", error: true });
    }

    if (role_id !== 1) {
      return res.status(403).json({ msg: "Solo los administradores pueden asignar pagos", error: true });
    }

    if(payment_record.status !== "confirmado") {
      return res.status(400).json({ msg: "Solo se pueden asignar pagos confirmados", error: true });
    }

    if (payment_record.walker_assigned === true) {
      return res.status(400).json({ msg: "Este pago ya ha sido asignado al paseador", error: true });
    }

    const total_amount = payment_record.amount;
    const commission_rate = 0.10;
    const commission_amount = Math.round(total_amount * commission_rate);
    const walker_amount = total_amount - commission_amount;

    await payment_record.update({
      walker_assigned: true,
      walker_amount: walker_amount,
      commission_amount: commission_amount,
      assignment_date: new Date(),
    });

    try {
      const walker_notification_data = {
        walker_email: payment_record.walk.walker.email,
        walker_name: payment_record.walk.walker.name,
        payment_id: payment_record.id,
        walk_id: payment_record.walk_id,
        walker_amount: walker_amount,
        commission_amount: commission_amount,
        total_amount: total_amount,
        assignment_date: new Date(),
        client_name: payment_record.walk.client.name,
        walk_date: payment_record.walk.scheduled_date,
        walk_duration: payment_record.walk.duration,
    };

    await send_payment_notification_to_walker(walker_notification_data);
    console.log('Notificacion enviada al paseador: $(payment_record.walk.walker.email)');
    } catch (emailError) {
      console.error("Error al enviar la notificación al paseador:", emailError);
      return res.status(500).json({ msg: "Pago asignado, pero error al notificar al paseador", error: true });
    }

    
    const walker = await user.findByPk(payment_record.walk.walker_id);
    if (!walker) {
      return res.status(404).json({ msg: "Paseador no encontrado", error: true });
    }
    walker.balance = walker.balance + walker_amount;
    await walker.save();
    
    await payment.create({
      user_id: payment_record.walk.walker_id,
      amount: walker_amount,
      status: "confirmado",
      walk_id: payment_record.walk_id,
      description: `Pago por caminata ${payment_record.walk_id} asignado al paseador`,
    });

    return res.json({
      msg: "Pago asignado exitosamente al paseador",
      error: false,
      data: {
        walker_id: payment_record.walk.walker.id,
        walker_name: payment_record.walk.walker.name,
        total_amount: total_amount,
        commission_amount: commission_amount,
        walker_amount: walker_amount,
        assignment_date: payment_record.assignment_date,
      },
    });
  } catch(err) {
    console.error("Error en assing_payment_to_walker:", err);
    return res.status(500).json({ msg: "Error al asignar el pago al paseador", error: true });
  }
};
module.exports = {
  update_payment_status,
  get_all_payments,
  get_payment_by_id,
};
