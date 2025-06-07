const nodemailer = require('nodemailer');

const send_payment_email = async (to, subject, text_content) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mail_options = {
      from: `"App Paseos Caninos TWP" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: text_content,
    };

    await transporter.sendMail(mail_options);
  } catch (error) {
    console.error("error enviando correo:", error);
    throw new Error("error enviando correo electrónico");
  }
};

const send_payment_receipt = async (receipt_data) => {
    try {
        const {
            payment_id,
            walk_id,
            amount,
            status,
            payment_date,
            client_email,
            client_name,
            walker_name = 'No asignado',
            walk_duration = 0,
            walk_date = new Date(),
            walk_comments = '',
            walk_type = '',
        } = receipt_data;

        // Validación de datos requeridos
        if (!client_email || !payment_id || !walk_id) {
            throw new Error('Datos incompletos para el comprobante');
        }

        const formatted_payment_date = new Date(payment_date).toLocaleDateString("es-CL", {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const formatted_walk_date = new Date(walk_date).toLocaleDateString("es-CL", {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const formatted_amount = new Intl.NumberFormat("es-CL", {
            style: "currency",
            currency: "CLP",
        }).format(amount);

        const subject = `Comprobante de Pago - Paseo #${walk_id}`;

        const text_content = `
COMPROBANTE DE PAGO
App Paseos Caninos TWP

================================================
INFORMACIÓN DEL PAGO
================================================
ID de Pago: ${payment_id}
ID de Paseo: ${walk_id}
Estado: ${status}
Fecha de Confirmación: ${formatted_payment_date}
Tipo de Paseo: ${walk_type}

================================================
DETALLES DEL PASEO
================================================
Cliente: ${client_name}
Paseador: ${walker_name}
Duración del Paseo (por dia): ${walk_duration} minutos
${walk_comments ? `Comentarios: ${walk_comments}` : 'Sin comentarios'}
Fecha del Paseo: ${formatted_walk_date}

================================================
INFORMACIÓN FINANCIERA
================================================
Monto Total: ${formatted_amount}

================================================
NOTA IMPORTANTE
================================================
Este comprobante confirma el pago exitoso de su servicio de paseo canino.
Conserve este comprobante como respaldo de su transacción.

Para cualquier consulta o reclamo, puede contactarnos respondiendo a este correo.

Gracias por confiar en App Paseos Caninos TWP.

=================================
Este es un correo automático, por favor no responda directamente.
`;

        await send_payment_email(client_email, subject, text_content);
        return { success: true, email: client_email };

    } catch (error) {
        console.error("Error en send_payment_receipt:", {
            payment_id: receipt_data.payment_id,
            error: error.message
        });
        throw new Error("Error al enviar el comprobante de pago");
    }
};

const send_payment_notification_to_walker = async (walker_data) => {
    try {
        const {
            walker_email,
            walker_name,
            payment_id,
            walk_id,
            walker_amount,
            commission_amount,
            total_amount,
            assignment_date = new Date(),
            client_name = 'Cliente',
            walk_date = new Date(),
            walk_duration = 0,
            walk_comments = '', // Nuevo campo para comentarios
            walk_type = '' // Nuevo campo para tipo de paseo
        } = walker_data;

        // Validación de datos requeridos
        if (!walker_email || !payment_id || !walk_id) {
            throw new Error('Datos incompletos para notificación al paseador');
        }

        // Formateo de fechas y montos
        const formatted_assignment_date = new Date(assignment_date).toLocaleDateString("es-CL", {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const formatted_walk_date = new Date(walk_date).toLocaleDateString("es-CL", {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const formatted_total = new Intl.NumberFormat("es-CL", {
            style: "currency",
            currency: "CLP",
        }).format(total_amount);

        const formatted_commission = new Intl.NumberFormat("es-CL", {
            style: "currency",
            currency: "CLP",
        }).format(commission_amount);

        const formatted_walker_amount = new Intl.NumberFormat("es-CL", {
            style: "currency",
            currency: "CLP",
        }).format(walker_amount);

        const subject = `Pago Asignado - Paseo #${walk_id}`;

        const text_content = `
NOTIFICACIÓN DE PAGO
App Paseos Caninos TWP

Hola ${walker_name},

¡Excelentes noticias! Se ha confirmado el pago de uno de tus servicios.

================================================
INFORMACIÓN DEL SERVICIO
================================================
ID de Paseo: ${walk_id}
ID de Pago: ${payment_id}
Cliente: ${client_name}
Tipo de Paseo: ${walk_type}
Fecha del Paseo: ${formatted_walk_date}
Duración (por dia): ${walk_duration} minutos
${walk_comments ? `Comentarios: ${walk_comments}\n` : ''}
Fecha de Asignación: ${formatted_assignment_date}

================================================
DESGLOSE FINANCIERO
================================================
Monto Total del Servicio: ${formatted_total}
Comisión de la Plataforma: ${formatted_commission}
Monto a Recibir: ${formatted_walker_amount}

================================================
PRÓXIMOS PASOS
================================================
El pago será procesado según los términos y condiciones acordados.
Puedes revisar el detalle completo en tu panel de paseador.

¡Gracias por ser parte de App Paseos Caninos TWP!

================================================
Este es un correo automático, por favor no respondas directamente.
`;

        await send_payment_email(walker_email, subject, text_content);
        return { success: true, email: walker_email };

    } catch (error) {
        console.error("Error en send_payment_notification_to_walker:", {
            payment_id: walker_data.payment_id,
            error: error.message
        });
        throw new Error("Error al enviar la notificación de pago al paseador");
    }
};

module.exports = {
    send_payment_receipt,
    send_payment_notification_to_walker,
};