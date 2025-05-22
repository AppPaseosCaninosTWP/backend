const dayjs = require("dayjs");
const PDFDocument = require("pdfkit");
const db = require("../models");
const { Op } = require("sequelize");

const commissionRate = 0.1; // 10% de comision

const createPayment = async (req, res) => {
    const { walk_id, amount } = req.body;

    const payment = await db.payment.create({
        walk_id,
        amount,
        date: dayjs().toDate(),
        status: "pendiente"
    });

    return res
        .status(201)
        .json({
            message: "Pago creado correctamente",
            data: payment
        });
}

const processPayment = async (req, res) => {
    const { payment_id } = req.params;

    const payment = await db.payment.findByPk(payment_id);
    payment.status = "Completado";
    await payment.save();

    res.json(payment);
}

const verifyCommission = async (req, res) => {
    const { payment_id } = req.params;

    const payment = await db.payment.findByPk(payment_id, {
        include: {
            model: db.walk,
            as: "walk",
            include: {
                model: db.walker,
                as: "walker"
            }
        }
    });

    const commission = parseFloat((payment.amount * commissionRate).toFixed(2));
    const walkerAmount = parseFloat((payment.amount - commission).toFixed(2));

    const transaction = await db.transaction.create({
        payment_id: payment.payment_id,
        total_amount: payment.amount,
        commission,
        walker_amount: walkerAmount,
        date: dayjs().toDate()
    });

    const walker = payment.walk.walker;
    walker.balance = parseFloat((parseFloat(walker.balance || 0) + walkerAmount).toFixed(2));
    await walker.save();

    return res
        .status(201)
        .json({
            message: "Comisión verificada correctamente",
            data: {
                walker_balance: walker.balance,
                commission_applied: commission
            }
        });
}

const getBalance = async (req, res) => {
    const { walker_id } = req.params;

    const walker = await db.walker.findByPk(walker_id);

    return res
        .status(200)
        .json({
            message: "Saldo obtenido correctamente",
            data: {
                balance: walker.balance || 0,
                currency: "CLP"
            }
        });
}

const generateReceipt = async (req, res) => {
    const { payment_id } = req.params;
    
    const payment = await db.payment.findByPk(payment_id, {
      include: [{ 
        model: db.walk, 
        include: [
            db.user, 
            db.walker
            ] 
        }]
    });

    const doc = new PDFDocument();
    const formattedDate = dayjs(payment.date).format("YYYY-MM-DD HH:mm:ss");

    doc.fontSize(20).text("Comprobante de Pago", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(`ID de Pago: ${payment.payment_id}`);
    doc.text(`Fecha: ${formattedDate}`);
    doc.moveDown();
    doc.text(`Cliente: ${payment.walk.user.name}`);
    doc.text(`Paseador: ${payment.walk.walker.name}`);
    doc.moveDown();
    doc.text(`Monto Total: CLP ${payment.amount.toFixed(2)}`);

    if (payment.status === "completed") {
      const commission = payment.amount * COMMISSION_RATE;
      const walkerAmount = payment.amount - commission;
      doc.moveDown();
      doc.text(`Comisión (${COMMISSION_RATE * 100}%): CLP ${commission.toFixed(2)}`);
      doc.text(`Monto para Paseador: CLP ${walkerAmount.toFixed(2)}`);
    }

    doc.moveDown();
    doc.text(`Estado: ${payment.status === "completed" ? "Completado" : "Pendiente"}`);
    doc.end();

    // Configurar respuesta
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=comprobante_${payment_id}.pdf`);
    
    doc.pipe(res);
}

const paymentHistory = async (req, res) => {
    const { walker_id } = req.params;
    const { start_date, end_date } = req.query;

    const payments = await db.payment.findAll({
      include: [{
        model: db.walk,
        where: { walker_id },
        include: [db.user]
      }],
      where: {
        date: {
          [Op.between]: [
            dayjs(start_date).startOf("day").toDate(),
            dayjs(end_date).endOf("day").toDate()
          ]
        }
      },
      order: [["date", "DESC"]]
    });

    const formattedPayments = payments.map(p => ({
      id: p.payment_id,
      amount: p.amount,
      date: dayjs(p.date).format("YYYY-MM-DD HH:mm:ss"),
      status: p.status,
      client: p.walk.user.name
    }));

    return res
        .status(200)
        .json({
            message: "Historial de pagos obtenido correctamente",
            data: formattedPayments
        });
}

module.exports = {
    createPayment,
    processPayment,
    verifyCommission,
    getBalance,
    generateReceipt,
    paymentHistory
};