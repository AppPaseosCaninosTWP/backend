const { rating: Rating } = require('../models/database');
const { fn, col } = require('sequelize');

const get_walk_ratings = async (req, res) => {
  try {
    const walkId = parseInt(req.params.walk_id, 10);
    if (isNaN(walkId)) {
      return res.status(400).json({ msg: 'walk_id inválido', error: true });
    }

    const ratings = await Rating.findAll({
      where: { walk_id: walkId },
      order: [['created_at', 'DESC']],
    });

    if (ratings.length === 0) {
      return res.json({
        msg: 'No hay calificaciones asociadas a este paseo',
        total_items: 0,
        ratings: [],
      });
    }

    return res.json({
      total_items: ratings.length,
      ratings,
    });
  } catch (err) {
    console.error('Error en get_walk_ratings:', err);
    return res.status(500).json({
      msg: 'Error al obtener calificaciones de paseo',
      error: true,
    });
  }
};

const list_ratings = async (req, res) => {
  try {
    const pageParam = req.query.page;
    let page = 1;

    if (pageParam !== undefined) {
      page = parseInt(pageParam, 10);
      if (isNaN(page) || page < 1) {
        return res.status(400).json({ msg: 'page inválido', error: true });
      }
    }

    const limit = 10;
    const offset = (page - 1) * limit;
    const { count, rows: ratings } = await Rating.findAndCountAll({
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    if (count === 0) {
      return res.json({
        msg: 'No hay calificaciones registradas',
        total_pages: 0,
        total_items: 0,
        ratings: [],
      });
    }

    return res.json({
      page,
      total_pages: Math.ceil(count / limit),
      total_items: count,
      ratings,
    });
  } catch (err) {
    console.error('Error en list_ratings:', err);
    return res.status(500).json({
      msg: 'Error al listar calificaciones',
      error: true,
    });
  }
};

const get_user_ratings = async (req, res) => {
  try {
    const userId = parseInt(req.params.user_id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ msg: "user_id inválido", error: true });
    }

    // 2) Ahora sí llama al mock de Rating.findAll
    const ratings = await Rating.findAll({
      where: { receiver_id: userId },
      order: [["created_at", "DESC"]],
    });

    if (ratings.length === 0) {
      return res.json({
        msg:            "No hay calificaciones para este usuario",
        user_id:        userId,
        total_items:    0,
        average_rating: 0,
        ratings:        [],
      });
    }

    const result = await Rating.findOne({
      attributes: [[fn("AVG", col("value")), "average_rating"]],
      where:      { receiver_id: userId },
      raw:        true,
    });
    const average_rating = parseFloat(result.average_rating).toFixed(2);

    return res.json({
      user_id:        userId,
      total_items:    ratings.length,
      average_rating: Number(average_rating),
      ratings,
    });
  } catch (err) {
    console.error("Error en get_user_ratings:", err);
    return res
      .status(500)
      .json({ msg: "Error al obtener calificaciones de usuario", error: true });
  }
};

module.exports = {
  get_walk_ratings,
  list_ratings,
  get_user_ratings,
};