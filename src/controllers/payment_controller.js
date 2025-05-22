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
                payment,
                transaction
            }
        });
}
