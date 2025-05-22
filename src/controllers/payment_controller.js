const dayjs = require("dayjs");
const PDFDocument = require("pdfkit");
const { payment, walk, user, transaction, walker_profile } = require("../models/database");
const { Op } = require("sequelize");

const COMMISSION_RATE = 0.1; // 10% de comisión

const createPayment = async (req, res) => {
    const { walk_id, amount } = req.body;

    try {
        const newPayment = await payment.create({
            walk_id,
            amount: parseFloat(amount).toFixed(2),
            date: dayjs().toDate(),
            status: "pendiente"
        });

        return res.status(201).json({
            message: "Pago creado correctamente",
            data: newPayment
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error al crear pago",
            error: error.message
        });
    }
}

const processPayment = async (req, res) => {
    const { payment_id } = req.params;

    try {
        const paymentRecord = await payment.findByPk(payment_id);
        if (!paymentRecord) {
            return res.status(404).json({ message: "Pago no encontrado" });
        }

        paymentRecord.status = "completado";
        await paymentRecord.save();

        return res.json({
            message: "Pago procesado correctamente",
            data: paymentRecord
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error al procesar pago",
            error: error.message
        });
    }
}

const verifyCommission = async (req, res) => {
    try {
    const paymentRecord = await payment.findByPk(req.params.payment_id, {
      include: [{
        model: walk,
        as: 'walk',
        include: [{
          model: user,
          as: 'walker',
          foreignKey: 'walker_id'
        }]
      }]
    });

    if (!paymentRecord) {
      return res.status(404).json({ message: "Pago no encontrado" });
    }

    if (paymentRecord.status !== "completado") {
      return res.status(400).json({ message: "El pago no ha sido completado" });
    }

    const commission = parseFloat((paymentRecord.amount * COMMISSION_RATE).toFixed(2));
    const walkerAmount = parseFloat((paymentRecord.amount - commission).toFixed(2));

    await payment.update({
      commission: commission,
      walker_amount: walkerAmount,
      commission_date: dayjs().toDate()
    }, {
      where: { payment_id: req.params.payment_id }
    });

    const walker = paymentRecord.walk.walker;
    if (walker) {
      walker.balance = parseFloat((parseFloat(walker.balance || 0) + walkerAmount).toFixed(2));
      await walker.save();
    }

    return res.status(200).json({
      message: "Comisión verificada correctamente",
      data: {
        payment_id: paymentRecord.payment_id,
        walker_balance: walker?.balance || 0,
        commission_applied: commission
      }
    });

  } catch (error) {
    console.error('Error en verifyCommission:', error);
    return res.status(500).json({
      message: "Error al verificar comisión",
      error: error.message
    });
  }
}

const getBalance = async (req, res) => {
    try {
    const walkerProfile = await walker_profile.findOne({
      where: { walker_id: req.params.walker_id },
      include: [{
        model: user,
        as: 'user'
      }]
    });

    if (!walkerProfile) {
      return res.status(404).json({ 
        message: "Perfil de paseador no encontrado" 
      });
    }

    return res.status(200).json({
      message: "Saldo obtenido correctamente",
      data: {
        walker_id: walkerProfile.walker_id,
        walker_name: walkerProfile.user?.name || 'Sin nombre',
        balance: walkerProfile.balance || 0,
        currency: "CLP"
      }
    });

  } catch (error) {
    console.error('Error detallado en getBalance:', error);
    return res.status(500).json({
      message: "Error al obtener saldo",
      error: error.message
    });
  }
}

const generateReceipt = async (req, res) => {
    try {
    // 1. Obtener el pago con todas las relaciones necesarias
    const paymentRecord = await payment.findByPk(req.params.payment_id, {
      include: [{
        model: walk,
        as: 'walk',
        include: [
          { 
            model: user, 
            as: 'client',
            attributes: ['user_id', 'name', 'email'] // Solo los campos necesarios
          },
          {
            model: user,
            as: 'walker',
            attributes: ['user_id', 'name', 'email'],
            include: [{
              model: walker_profile,
              as: 'walker_profile',
              attributes: ['zone']
            }]
          }
        ]
      }]
    });

    if (!paymentRecord) {
      return res.status(404).json({ message: "Pago no encontrado" });
    }

    // 2. Validar datos requeridos
    if (!paymentRecord.walk) {
      return res.status(400).json({ message: "Datos del paseo incompletos" });
    }

    // 3. Crear el PDF
    const doc = new PDFDocument();
    const formattedDate = dayjs(paymentRecord.date).format("YYYY-MM-DD HH:mm:ss");

    // Cabecera
    doc.fontSize(20).text("Comprobante de Pago", { align: "center" });
    doc.moveDown();
    
    // Información básica
    doc.fontSize(14).text(`ID de Pago: ${paymentRecord.payment_id}`);
    doc.text(`Fecha: ${formattedDate}`);
    doc.moveDown();
    
    // Información del cliente (con validación)
    const clientName = paymentRecord.walk.client?.name || 'Cliente no especificado';
    const clientEmail = paymentRecord.walk.client?.email || 'Email no disponible';
    
    doc.text(`Cliente: ${clientName}`);
    doc.text(`Email: ${clientEmail}`);
    doc.moveDown();
    
    // Información del paseador (con validación)
    const walkerName = paymentRecord.walk.walker?.name || 'Paseador no asignado';
    const walkerZone = paymentRecord.walk.walker?.walker_profile?.zone || 'Zona no especificada';
    
    doc.text(`Paseador: ${walkerName}`);
    doc.text(`Zona: ${walkerZone}`);
    doc.moveDown();
    
    // Detalles financieros
    doc.text(`Monto Total: CLP ${paymentRecord.amount?.toFixed(2) || '0.00'}`);
    
    if (paymentRecord.commission) {
      doc.moveDown();
      doc.text(`Comisión (${COMMISSION_RATE * 100}%): CLP ${paymentRecord.commission.toFixed(2)}`);
      doc.text(`Monto para Paseador: CLP ${paymentRecord.walker_amount?.toFixed(2) || '0.00'}`);
    }

    // Estado
    doc.moveDown();
    const status = paymentRecord.status === "completado" ? "Completado" : "Pendiente";
    doc.text(`Estado: ${status}`);
    
    doc.end();

    // 4. Configurar respuesta
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=comprobante_${req.params.payment_id}.pdf`);
    doc.pipe(res);

  } catch (error) {
    console.error('Error en generateReceipt:', {
      message: error.message,
      stack: error.stack,
      params: req.params
    });
    
    return res.status(500).json({
      message: "Error al generar comprobante",
      error: "Error interno del servidor"
    });
  }
}

const paymentHistory = async (req, res) => {
    
    try {
    const payments = await payment.findAll({
      include: [{
        model: walk,
        as: 'walk',
        where: { walker_id: req.params.walker_id },
        include: [{
          model: user,
          as: 'client' // Cambiado de 'user' a 'client'
        }]
      }],
      order: [['date', 'DESC']]
    });

        const formattedPayments = payments.map(p => ({
            id: p.payment_id,
            amount: p.amount,
            date: dayjs(p.date).format("YYYY-MM-DD HH:mm:ss"),
            status: p.status,
            client: p.walk.user.name
        }));

        return res.status(200).json({
            message: "Historial de pagos obtenido correctamente",
            data: formattedPayments
        });
    } catch (error) {
        console.error("Error detallado:", error);
        return res.status(500).json({
            message: "Error al obtener historial",
            error: error.message
        });
    }
}

module.exports = {
    createPayment,
    processPayment,
    verifyCommission,
    getBalance,
    generateReceipt,
    paymentHistory
};