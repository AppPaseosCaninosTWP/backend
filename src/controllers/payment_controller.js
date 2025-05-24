const dayjs = require("dayjs");
const PDFDocument = require("pdfkit");
const {
  payment,
  walk,
  user,
  transaction,
  walker_profile,
} = require("../models/database");
const { Op } = require("sequelize");

const COMMISSION_RATE = 0.1; // 10%

const create_payment = async (req, res) => {
  const { walk_id, amount } = req.body;

  try {
    const new_payment = await payment.create({
      walk_id,
      amount: parseFloat(amount).toFixed(2),
      date: dayjs().toDate(),
      status: "pendiente",
    });

    return res.status(201).json({
      msg: "Pago creado correctamente",
      data: new_payment,
    });
  } catch (error) {
    console.error("Error en create_payment:", error);
    return res.status(500).json({
      msg: "Error al crear el pago",
      error: error.message,
    });
  }
};

const process_payment = async (req, res) => {
  const { payment_id } = req.params;

  try {
    const record = await payment.findByPk(payment_id);

    if (!record) {
      return res.status(404).json({ msg: "Pago no encontrado" });
    }

    record.status = "completado";
    await record.save();

    return res.json({
      msg: "Pago procesado correctamente",
      data: record,
    });
  } catch (error) {
    console.error("Error en process_payment:", error);
    return res.status(500).json({
      msg: "Error al procesar el pago",
      error: error.message,
    });
  }
};

const verify_commission = async (req, res) => {
  const { payment_id } = req.params;

  try {
    const record = await payment.findByPk(payment_id, {
      include: [
        {
          model: walk,
          as: "walk",
          include: [
            {
              model: user,
              as: "walker",
            },
          ],
        },
      ],
    });

    if (!record) {
      return res.status(404).json({ msg: "Pago no encontrado" });
    }

    if (record.status !== "completado") {
      return res.status(400).json({ msg: "El pago aún no ha sido completado" });
    }

    const commission = parseFloat((record.amount * COMMISSION_RATE).toFixed(2));
    const walker_amount = parseFloat((record.amount - commission).toFixed(2));

    await payment.update(
      {
        commission,
        walker_amount,
        commission_date: dayjs().toDate(),
      },
      { where: { payment_id } }
    );

    const walker = record.walk.walker;
    if (walker) {
      walker.balance = parseFloat(
        (parseFloat(walker.balance || 0) + walker_amount).toFixed(2)
      );
      await walker.save();
    }

    return res.status(200).json({
      msg: "Comisión verificada correctamente",
      data: {
        payment_id: record.payment_id,
        walker_balance: walker?.balance || 0,
        commission_applied: commission,
      },
    });
  } catch (error) {
    console.error("Error en verify_commission:", error);
    return res.status(500).json({
      msg: "Error al verificar la comisión",
      error: error.message,
    });
  }
};

const get_balance = async (req, res) => {
  try {
    const profile = await walker_profile.findOne({
      where: { walker_id: req.params.walker_id },
      include: [{ model: user, as: "user" }],
    });

    if (!profile) {
      return res.status(404).json({ msg: "Perfil de paseador no encontrado" });
    }

    return res.status(200).json({
      msg: "Saldo obtenido correctamente",
      data: {
        walker_id: profile.walker_id,
        walker_name: profile.user?.name || "Sin nombre",
        balance: profile.balance || 0,
        currency: "CLP",
      },
    });
  } catch (error) {
    console.error("Error en get_balance:", error);
    return res.status(500).json({
      msg: "Error al obtener saldo",
      error: error.message,
    });
  }
};

const generate_receipt = async (req, res) => {
  try {
    const record = await payment.findByPk(req.params.payment_id, {
      include: [
        {
          model: walk,
          as: "walk",
          include: [
            {
              model: user,
              as: "client",
              attributes: ["user_id", "name", "email"],
            },
            {
              model: user,
              as: "walker",
              attributes: ["user_id", "name", "email"],
              include: [
                {
                  model: walker_profile,
                  as: "walker_profile",
                  attributes: ["zone"],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!record) {
      return res.status(404).json({ msg: "Pago no encontrado" });
    }

    if (!record.walk) {
      return res.status(400).json({ msg: "Datos del paseo incompletos" });
    }

    const doc = new PDFDocument();
    const formatted_date = dayjs(record.date).format("YYYY-MM-DD HH:mm:ss");

    doc
      .fontSize(20)
      .text("Comprobante de Pago", { align: "center" })
      .moveDown();
    doc.fontSize(14).text(`ID de Pago: ${record.payment_id}`);
    doc.text(`Fecha: ${formatted_date}`).moveDown();

    doc.text(
      `Cliente: ${record.walk.client?.name || "Cliente no especificado"}`
    );
    doc
      .text(`Email: ${record.walk.client?.email || "Email no disponible"}`)
      .moveDown();

    doc.text(`Paseador: ${record.walk.walker?.name || "Paseador no asignado"}`);
    doc
      .text(
        `Zona: ${
          record.walk.walker?.walker_profile?.zone || "Zona no especificada"
        }`
      )
      .moveDown();

    doc.text(`Monto Total: CLP ${record.amount?.toFixed(2) || "0.00"}`);

    if (record.commission) {
      doc.moveDown();
      doc.text(
        `Comisión (${COMMISSION_RATE * 100}%): CLP ${record.commission.toFixed(
          2
        )}`
      );
      doc.text(
        `Monto para Paseador: CLP ${record.walker_amount?.toFixed(2) || "0.00"}`
      );
    }

    doc.moveDown();
    const status = record.status === "completado" ? "Completado" : "Pendiente";
    doc.text(`Estado: ${status}`);

    doc.end();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=comprobante_${req.params.payment_id}.pdf`
    );
    doc.pipe(res);
  } catch (error) {
    console.error("Error en generate_receipt:", error);
    return res.status(500).json({
      msg: "Error al generar comprobante",
      error: "Error interno del servidor",
    });
  }
};

const payment_history = async (req, res) => {
  try {
    const payments = await payment.findAll({
      include: [
        {
          model: walk,
          as: "walk",
          where: { walker_id: req.params.walker_id },
          include: [{ model: user, as: "client" }],
        },
      ],
      order: [["date", "DESC"]],
    });

    const data = payments.map((p) => ({
      id: p.payment_id,
      amount: p.amount,
      date: dayjs(p.date).format("YYYY-MM-DD HH:mm:ss"),
      status: p.status,
      client: p.walk.client?.name || "Desconocido",
    }));

    return res.status(200).json({
      msg: "Historial de pagos obtenido correctamente",
      data,
    });
  } catch (error) {
    console.error("Error en payment_history:", error);
    return res.status(500).json({
      msg: "Error al obtener historial",
      error: error.message,
    });
  }
};

module.exports = {
  create_payment,
  process_payment,
  verify_commission,
  get_balance,
  generate_receipt,
  payment_history,
};