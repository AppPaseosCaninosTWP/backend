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


