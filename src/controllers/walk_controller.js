const {
  walk,
  user,
  walk_type,
  pet_walk,
  pet,
  days_walk,
} = require("../models/database");
const { Op } = require("sequelize");

const create_walk = async (req, res) => {
  const { walk_type_id, pet_id, comments, start_time, duration, days } =
    req.body;
  const client_id = req.user.user_id;

  try {
    if (!Array.isArray(days) || days.length === 0) {
      return res
        .status(400)
        .json({ msg: "Debes proporcionar al menos un día para el paseo." });
    }

    if (!start_time || !duration) {
      return res
        .status(400)
        .json({ msg: "Debes proporcionar hora de inicio y duración." });
    }

    const newWalk = await walk.create({
      walk_type_id,
      client_id,
      comments,
      status: "pendiente",
    });

    for (const date of days) {
      await days_walk.create({
        walk_id: newWalk.walk_id,
        start_date: date,
        start_time,
        duration,
      });
    }

    await pet_walk.create({
      walk_id: newWalk.walk_id,
      pet_id,
    });

    res.status(201).json({
      msg: "Paseo creado exitosamente",
      walk_id: newWalk.walk_id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error al crear el paseo" });
  }
};

module.exports = {
  create_walk,
  get_all_walks,
  get_walk_by_id,
};
