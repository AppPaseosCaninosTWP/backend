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

const get_all_walks = async (req, res) => {
  const { user_id, role_id } = req.user;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    let condition = {};

    if (role_id === 3) {
      condition.client_id = user_id;
    } else if (role_id === 2) {
      condition = {
        [Op.or]: [
          { walker_id: user_id },
          { status: "pendiente", walker_id: null },
        ],
      };
    }

    const { count, rows } = await walk.findAndCountAll({
      where: condition,
      include: [
        {
          model: user,
          as: "client",
          attributes: ["email"],
        },
        {
          model: user,
          as: "walker",
          attributes: ["email"],
        },
        {
          model: walk_type,
          attributes: ["name"],
        },
        {
          model: days_walk,
          as: "days",
        },
      ],
      limit,
      offset,
      order: [["walk_id", "DESC"]],
    });

    const data = rows.map((w) => ({
      walk_id: w.walk_id,
      walk_type: w.walk_type?.name,
      status: w.status,
      client_email: w.client?.email,
      walker_email: w.walker?.email ?? null,
      days:
        w.days?.map((d) => ({
          start_date: d.start_date,
          start_time: d.start_time,
          duration: d.duration,
        })) ?? [],
    }));

    return res.json({
      msg: "Paseos obtenidos exitosamente",
      data,
      total: count,
      page,
      limit,
      error: false,
    });
  } catch (error) {
    console.error("Error en get_all_walks:", error);
    return res.status(500).json({ msg: "Error en el servidor", error: true });
  }
};

const get_walk_by_id = async (req, res) => {
  const { id } = req.params;
  const { user_id, role_id } = req.user;

  try {
    const w = await walk.findByPk(id, {
      include: [
        {
          model: user,
          as: "client",
          attributes: ["user_id", "email", "phone"],
        },
        {
          model: user,
          as: "walker",
          attributes: ["user_id", "email", "phone"],
        },
        {
          model: walk_type,
          attributes: ["walk_type_id", "name"],
        },
        {
          model: pet_walk,
          include: [{ model: pet }],
        },
        {
          model: days_walk,
          as: "days",
        },
      ],
    });

    if (!w) {
      return res.status(404).json({
        msg: "Paseo no encontrado",
        error: true,
      });
    }

    const isAdmin = role_id === 1;
    const isClientOwner = role_id === 3 && w.client_id === user_id;
    const isWalkerAssigned = role_id === 2 && w.walker_id === user_id;
    const isWalkerPending =
      role_id === 2 && w.status === "pendiente" && w.walker === null;

    if (!isAdmin && !isClientOwner && !isWalkerAssigned && !isWalkerPending) {
      return res.status(403).json({
        msg: "No tienes permiso para ver este paseo",
        error: true,
      });
    }

    const pets = w.pet_walks?.map((pw) => pw.pet) || [];

    const walkData = {
      walk_id: w.walk_id,
      walk_type: w.walk_type,
      status: w.status,
      comments: w.comments,
      client: w.client,
      walker: w.walker,
      pets,
      days: w.days,
    };

    return res.json({
      msg: "Paseo obtenido exitosamente",
      data: walkData,
      error: false,
    });
  } catch (error) {
    console.error("Error en get_walk_by_id:", error);
    return res.status(500).json({
      msg: "Error en el servidor",
      error: true,
    });
  }
};

module.exports = {
  create_walk,
  get_all_walks,
  get_walk_by_id,
};
