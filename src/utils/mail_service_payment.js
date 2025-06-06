const { send_email } = require("./email_service");

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
            walker_name,
            walk_duration,
            walk_date,
        } = receipt_data;

        const formatted_payment_date = new Date(payment_date).toLocaleDateString("es-CL", {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hours: '2-digit',
            minutes: '2-digit',
        });

        const formatted_walk_date = new Date(walk_date).toLocaleDateString("es-CL", {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hours: '2-digit',
            minutes: '2-digit',
        });

        const formatted_amount = new Intl.NumberFormat("es-CL", {
            style: "currency",
            currency: "CLP",
        }).format(amount);

        const subject = 'Comprobante de Pago - Paseo #${walk_id}';

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

        ================================================
        DETALLES DEL PASEO
        ================================================
        Cliente: ${client_name}
        Paseador: ${walker_name}
        Duración del Paseo: ${walk_duration} minutos
        Fecha del Paseo: ${formatted_walk_date}

        ================================================
        INFORMACION FINANCIERA
        ================================================
        Monto Total: ${formatted_amount}
        ================================================
        NOTA IMPORTANTE
        ================================================
        Este comprobante confirma el pago exitoso de su servicio de paseo canino.
        Conserve este comprobante como respaldo de su transacción.

        Para cualquier consulta o reclamo, puede contactarnos repsondendo a este correo electrónico.

        Graciass por confiar en App Paseos Caninos TWP.

        =================================
        Este es un correo automático, por favor no responda.
        `;

        await send_email(client_email, subject, text_content);

        console.log("Comprobante de pago enviado exitosamente a:", client_email);

    } catch (error) {
        console.error("Error enviando comprobante de pago:", error);
        throw new Error("Error al enviar el comprobante de pago");
    }
};

const send_payment_notification_to_walker = async (walker_data) => {
    try{
        const{
            walker_email,
            walker_name,
            payment_id,
            walk_id,
            walker_amount,
            commission_amount,
            total_amount,
            assignment_date,
            client_name,
            walk_date,
            walk_duration,
        } = walker_data;

        const formatted_assignment_date = new Date(assignment_date).toLocaleDateString("es-CL", {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hours: '2-digit',
            minutes: '2-digit',
        });

        const formatted_walk_date = new Date(walk_date).toLocaleDateString("es-CL", {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hours: '2-digit',
            minutes: '2-digit',
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

        const subject = 'Paso Asignado - Paseo #${walk_id}';

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
        Cliente: ${client_name || 'N/A'}
        Fecha del Paseo: ${formatted_walk_date}
        Duración: ${walk_duration} minutos
        Fecha de Asignación: ${formatted_assignment_date}
        ================================================
        DESGLOSE FINANCIERO
        ================================================
        Monto Total del Servicio: ${formatted_total}
        Comisión de la Plataforma: ${formatted_commission}
        Monto a Recibir: ${formatted_walker_amount}
        ================================================
        PROXIMOS PASOS
        ================================================
        El pago será procesado según los terminos y condiciones acordados.
        Puedes revisar el detalle completo en tu panel de paseador.

        ¡Gracias por ser parte de App Paseos Caninos TWP!
        ================================================
        Este es un correo automático, por favor no respondas.

        `;

        await send_email(walker_email, subject, text_content);

        console.log("Notificación de pago enviada exitosamente a:", walker_email);

    } catch (error) {
        console.error("Error enviando notificación de pago al paseador:", error);
        throw new Error("Error al enviar la notificación de pago al paseador");
    }
};

module.exports = {
    send_payment_receipt,
    send_payment_notification_to_walker,
};