const {
  walk,
  user,
  walk_type,
  pet_walk,
  pet,
  days_walk,
  walker_profile
} = require("../models/database");
const { Op } = require("sequelize");
const { sendNotification } = require('../utils/send_notification');
const dayjs = require("dayjs");
const { generate_days_for_week } = require("../utils/date_service");

const create_walk = async (req, res) => {
  const {
    walk_type_id,
    pet_id,
    comments,
    start_time,
    duration,
    days,
  } = req.body;

  const client_id = req.user.user_id;

  try {
    if (!Array.isArray(days) || days.length === 0) {
      return res
        .status(400)
        .json({ msg: "Debes seleccionar al menos un día." });
    }
    if (!start_time || !duration) {
      return res
        .status(400)
        .json({ msg: "Debes proporcionar hora de inicio y duración." });
    }
    if (walk_type_id === 1 && days.length < 2) {
      return res
        .status(400)
        .json({ msg: "Un paseo fijo requiere al menos 2 días." });
    }
    if (walk_type_id === 2 && days.length !== 1) {
      return res
        .status(400)
        .json({ msg: "Un paseo esporádico debe tener exactamente 1 día." });
    }

    const newWalk = await walk.create({
      walk_type_id,
      client_id,
      comments,
      status: "pendiente",
    });

    let days_to_insert = [];

    if (walk_type_id === 1) {
      days_to_insert = generate_days_for_week(days, start_time, duration);
    } else if (walk_type_id === 2) {
      const day_map = {
        lunes: 1,
        martes: 2,
        miercoles: 3,
        jueves: 4,
        viernes: 5,
        sabado: 6,
        domingo: 7,
      };

      const target_day = day_map[days[0]];
      if (!target_day) {
        return res.status(400).json({ msg: "Día inválido." });
      }

      let start_date = dayjs().startOf("day");
      while (start_date.isoWeekday() !== target_day) {
        start_date = start_date.add(1, "day");
      }

      days_to_insert = [
        {
          start_date: start_date.format("YYYY-MM-DD"),
          start_time,
          duration,
        },
      ];
    }

    for (const day of days_to_insert) {
      await days_walk.create({
        walk_id: newWalk.walk_id,
        start_date: day.start_date,
        start_time: day.start_time,
        duration: day.duration,
      });
    }

    await pet_walk.create({
      walk_id: newWalk.walk_id,
      pet_id,
    });

    return res.status(201).json({
      msg: "Paseo creado exitosamente",
      walk_id: newWalk.walk_id,
    });
  } catch (error) {
    console.error("Error en create_walk:", error);
    return res.status(500).json({ msg: "Error al crear el paseo" });
  }
};

const get_available_walks = async (req, res) => {
  try {
    const walkerId = req.user.user_id;
    const perfil = await walker_profile.findOne({
      where: { walker_id: walkerId },
      attributes: ["zone"],
    });
    if (!perfil) {
      return res
        .status(404)
        .json({ msg: "Perfil de paseador no encontrado", error: true });
    }
    const myZone = perfil.zone;

    const walks = await walk.findAll({
      where: {
        status: "pendiente",
        walker_id: null,
      },
      include: [
        {
          model: pet,
          as: "pets",
          through: { attributes: [] },
          attributes: ["pet_id", "name", "photo", "zone"],
          where: {
            zone: myZone
          },
        },
        {
          model: walk_type,
          as: "walk_type",
          attributes: ["name"],
        },
        {
          model: days_walk,
          as: "days",
          attributes: ["start_date", "start_time", "duration"],
          where: {
            start_date: {
              [Op.gte]: dayjs().format("YYYY-MM-DD"),
            },
          },
        },
      ],
      order: [["walk_id", "DESC"]],
    });

    const data = walks.map((w) => {
      const p = w.pets[0] || {};
      const d = w.days[0] || {};
      return {
        walk_id:   w.walk_id,
        pet_id:    p.pet_id,
        pet_name:  p.name,
        pet_photo: p.photo,
        sector:    p.zone,
        walk_type: w.walk_type.name,
        time:      d.start_time,
        date:      d.start_date,
        duration:  d.duration,
      };
    });

    return res.json({ msg: "Paseos disponibles obtenidos", data, error: false });
  } catch (err) {
    console.error("Error en get_available_walks:", err);
    return res
      .status(500)
      .json({ msg: "Error en el servidor", error: true });
  }
};

const accept_walk = async (req, res) => {
  const walkerId = req.user.user_id;
  const { walkId } = req.body;

  const profile = await walker_profile.findOne({
    where: { walker_id: walkerId },
  });
  const allowedZones = profile?.zone
    .split(',')
    .map(z => z.trim().toLowerCase()) || [];

  const t = await walk.sequelize.transaction();
  try {
    const w = await walk.findOne({
      where: {
        walk_id:   walkId,
        status:    'pendiente',
        walker_id: { [Op.is]: null },
      },
      include: [
        {
          model: days_walk,
          as: 'days',
          attributes: ['start_date','start_time'],
        },
        {
          model: pet,
          as: 'pets',
          through: { attributes: [] },
          attributes: ['zone'],
        }
      ],
      transaction: t,
      lock:        t.LOCK.UPDATE,
    });

    if (!w) {
      await t.rollback();
      return res
        .status(409)
        .json({ msg: 'Paseo ya fue tomado o no existe', error: true });
    }

    const p = w.pets[0];
    if (!p) {
      await t.rollback();
      return res
        .status(400)
        .json({ msg: 'Este paseo no tiene mascota asociada', error: true });
    }
    const walkZone = p.zone.trim().toLowerCase();
    if (!allowedZones.includes(walkZone)) {
      await t.rollback();
      return res
        .status(403)
        .json({ msg: 'Zona no permitida para este paseador', error: true });
    }

    w.walker_id = walkerId;
    w.status    = 'confirmado';
    await w.save({ transaction: t });
    await t.commit();

    sendNotification(w.client_id, {
      title: 'Tu paseo ha sido aceptado',
      body:  `El paseador ${req.user.name} aceptó tu paseo #${walkId}.`,
    });

    return res.json({ msg: 'Paseo aceptado correctamente', error: false });
  } catch (err) {
    await t.rollback();
    console.error('Error en accept_walk:', err);
    return res
      .status(500)
      .json({ msg: 'Error en el servidor', error: true });
  }
};

const get_assigned_walks = async (req, res) => {
  try {
    const walkerId = req.user.user_id;
    const walks = await walk.findAll({
      where: { walker_id: walkerId, status: 'confirmado' },
      include: [
        {
          model: pet,
          as: "pets",
          through: { attributes: [] },
          attributes: ["pet_id","name","photo","zone"]
        },
        {
          model: days_walk,
          as: "days",
          attributes: ["start_date","start_time", "duration"],
          where: {
            start_date: {
              [Op.gte]: dayjs().format("YYYY-MM-DD"),
            },
          },
        }
      ],
      order: [["walk_id","DESC"]]
    });

    const data = walks.map(w => {
      const p = w.pets[0] || {};
      const d = w.days[0] || {};
      return {
        walk_id:    w.walk_id,
        pet_id:     p.pet_id,
        pet_name:   p.name,
        pet_photo:  p.photo,
        zone:       p.zone,
        time:       d.start_time,
        date:       d.start_date,
        duration:   d.duration,
      };
    });

    return res.json({ msg:"Paseos asignados", data, error:false });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg:"Error en el servidor", error:true });
  }
};

const cancel_walk = async (req, res) => {
  const walkerId = req.user.user_id;
  const { walkId } = req.body;

  const w = await walk.findOne({
    where: { walk_id: walkId, walker_id: walkerId, status: 'confirmado' },
    include: [{ model: days_walk, as: 'days', attributes: ['start_date','start_time'] }],
  });
  if (!w) {
    return res.status(404).json({ msg: 'Paseo no encontrado o no eres su paseador', error: true });
  }

  const day0 = w.days[0];
  const walkDateTime = dayjs(`${day0.start_date} ${day0.start_time}`, 'YYYY-MM-DD HH:mm');
  if (walkDateTime.diff(dayjs(), 'minute') <= 30) {
    return res.status(403).json({ msg: 'Ya no puedes cancelar este paseo', error: true });
  }

  w.status = 'cancelado';
  w.walker_id = null;
  await w.save();

  sendNotification(w.client_id, {
    title: 'Paseo cancelado',
    body:  `Tu paseo #${walkId} fue cancelado por el paseador.`
  });
  sendNotification(walkerId, {
    title: 'Paseo cancelado',
    body:  `Cancelaste el paseo #${walkId}.`
  });

  return res.json({ msg: 'Paseo cancelado exitosamente', error: false });
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
  get_available_walks,
  get_walk_by_id,
  accept_walk,
  cancel_walk,
  get_assigned_walks,
};
