const { user, walk } = require("../models/database");
const { Op } = require("sequelize");

// Redireccionamiento al chat de whatsapp de cliente a paseador y viceversa
const redirect_whatsapp = async (req, res) => {
  try {
    const current_user_id = req.user.user_id;
    const target_user_id = parseInt(req.params.id);

    const receiver = await user.findByPk(target_user_id);
    if (!receiver) {
      return res.status(404).json({ error: true, msg: "Usuario no encontrado" });
    }

    // Verificamos si hay un paseo compartido en estado distinto a 'finalizado'
    const shared_walk = await walk.findOne({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { client_id: current_user_id, walker_id: target_user_id },
              { client_id: target_user_id, walker_id: current_user_id },
            ],
          },
          {
            status: {
              [Op.not]: "finalizado",
            },
          },
        ],
      },
    });

    if (!shared_walk) {
      return res.status(403).json({
        error: true,
        msg: "No tienes paseos activos con este usuario",
      });
    }

    const whatsapp_link = `https://wa.me/56${receiver.phone}`;

    return res.json({
      error: false,
      msg: "Redirección generada correctamente",
      data: {
        user_id: receiver.user_id,
        name: receiver.name,
        role_id: receiver.role_id,
        phone: receiver.phone,
        whatsapp_link,
      },
    });
  } catch (error) {
    console.error("Error en redirect_whatsapp:", error);
    return res.status(500).json({ error: true, msg: "Error en el servidor" });
  }
};

module.exports = { redirect_whatsapp };
