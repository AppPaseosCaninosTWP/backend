const {
  walk,
  user,
  walk_type,
  pet_walk,
  pet,
  days_walk,
} = require("../models/database");
const { Op } = require("sequelize");

const validator = require("validator");
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
    // Validación de tipo de paseo
    if (![1, 2].includes(parseInt(walk_type_id))) {
      return res.status(400).json({ 
        msg: "Tipo de paseo inválido (1: fijo, 2: esporádico)", 
        error: true 
      });
    }

    // Validación de pet_id (sin usar validator)
    if (!pet_id || isNaN(parseInt(pet_id))) {
      return res.status(400).json({ 
        msg: "ID de mascota inválido", 
        error: true 
      });
    }

    // Verificar que la mascota pertenece al usuario
    const petExists = await pet.findOne({
      where: {
        pet_id: parseInt(pet_id),
        owner_id: client_id 
      }
    });

    if (!petExists) {
      return res.status(404).json({ 
        msg: "Mascota no encontrada o no pertenece al usuario", 
        error: true 
      });
    }

    // Validar días según tipo de paseo
    const validDays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    
    if (!Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ 
        msg: "Debes seleccionar al menos un día", 
        error: true 
      });
    }

    if (walk_type_id == 1 && days.length < 2) {
      return res.status(400).json({ 
        msg: "Un paseo fijo requiere al menos 2 días", 
        error: true 
      });
    }

    if (walk_type_id == 2 && days.length !== 1) {
      return res.status(400).json({ 
        msg: "Un paseo esporádico debe tener exactamente 1 día", 
        error: true 
      });
    }

    // Validar formato de hora (sin usar validator)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start_time)) {
      return res.status(400).json({ 
        msg: "Formato de hora inválido (debe ser HH:MM, 24 horas)", 
        error: true 
      });
    }

    // Validar duración
    if (![30, 60].includes(parseInt(duration))) {
      return res.status(400).json({ 
        msg: "Duración inválida (solo 30 o 60 minutos)", 
        error: true 
      });
    }

    // Validar comentarios (sin usar validator)
    if (comments && comments.length > 250) {
      return res.status(400).json({ 
        msg: "Los comentarios no pueden exceder 250 caracteres", 
        error: true 
      });
    }

    // Crear transacción
    const transaction = await walk.sequelize.transaction();

    try {
      // Crear el paseo principal
      const newWalk = await walk.create({
        walk_type_id: parseInt(walk_type_id),
        client_id,
        comments: comments || null,
        status: "pendiente"
      }, { transaction });

      // Generar días del paseo
      let days_to_insert = [];
      const dayMap = {
        lunes: 1, martes: 2, miercoles: 3, jueves: 4, 
        viernes: 5, sabado: 6, domingo: 7
      };

      if (walk_type_id == 1) { // Paseo fijo
        days_to_insert = generate_days_for_week(days, start_time, duration);
      } else { // Paseo esporádico
        const target_day = dayMap[days[0].toLowerCase()];
        let start_date = dayjs().startOf("day");
        
        while (start_date.isoWeekday() !== target_day) {
          start_date = start_date.add(1, "day");
        }

        days_to_insert = [{
          start_date: start_date.format("YYYY-MM-DD"),
          start_time,
          duration: parseInt(duration),
        }];
      }

      // Crear días del paseo
      await Promise.all(days_to_insert.map(day => 
        days_walk.create({
          walk_id: newWalk.walk_id,
          start_date: day.start_date,
          start_time: day.start_time,
          duration: day.duration
        }, { transaction })
      ));

      // Asociar mascota
      await pet_walk.create({
        walk_id: newWalk.walk_id,
        pet_id: parseInt(pet_id)
      }, { transaction });

      // Confirmar transacción
      await transaction.commit();

      return res.status(201).json({
        msg: "Paseo creado exitosamente",
        walk_id: newWalk.walk_id,
        error: false
      });

    } catch (error) {
      // Revertir transacción en caso de error
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error("Error en create_walk:", error.message);
    return res.status(500).json({
      msg: "Error al crear el paseo",
      error: true,
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message
      })
    });
  }
};

const get_available_walks = async (req, res) => {
  try {
    // Validar parámetros de búsqueda si existem
    const { zone, date} = req.query;

    let whereCondition = {
      status: "pendiente",
      walker_id: null,
    };

    let includeConditions = [
      {
        model: pet,
        as: "pets",
        through: { attributes: [] },
        attributes: ["pet_id", "name", "photo", "zone"],
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
          }
        }
      }
    ];

    // Filtrar por sector si se proporciona
    if (zone) {
      includeConditions[0].where = {
        zone: {
          [Op.iLike]: `%${zone}%`,
        },
      };
    }

    // Filtrar por fecha especifica si se proporciona
    if (date && dayjs(date).isValid()) {
      includeConditions[2].where.start_date = {
        [Op.eq]: dayjs(date).format("YYYY-MM-DD"),
      };
    } else if (date) {
      return res
        .status(400)
        .json({
          msg: "Fecha inválida. Debe estar en formato YYYY-MM-DD.",
          error: true
        });
    }

    const walks = await walk.findAll({
      where: whereCondition,
      include: includeConditions,
      order: [["walk_id", "DESC"]]
    });

    const data = walks.map(w => {
      const p = w.pets[0] || {};
      const firstDay = w.days[0] || {};
      return {
        walk_id:   w.walk_id,
        pet_id:   p.pet_id,
        pet_name:  p.name,
        pet_photo: p.photo,
        sector:    p.zone,
        walk_type: w.walk_type.name,
        time:      firstDay.start_time,
        date:      firstDay.start_date,
        duration:  firstDay.duration,
      };
    });

    return res
      .json({ 
        msg: "Paseos disponibles obtenidos",
        data,
        error: false 
      });
  } catch (err) {
    console
    .error("Error en get_available_walks:", err);
    return res
    .status(500)
    .json({
      msg: "Error en el servidor",
      error: true
    });
  }
};

const get_all_walks = async (req, res) => {
  const { user_id, role_id } = req.user;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  // Validar parámetros de paginación
  if (isNaN(page) || page < 1) {
    return res
      .status(400)
      .json({
        msg: "Número de página invalido.",
        error: true
      });
  }

  if (isNaN(limit) || limit < 1 || limit > 100) {
    return res
      .status(400)
      .json({
        msg: "Limite inválido (1-100).",
        error: true
      });
  }

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
          as: "walk_type",
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
    return res
      .status(500)
      .json({
        msg: "Error en el servidor",
        error: true
      });
  }
};

const get_walk_by_id = async (req, res) => {
  const { id } = req.params;
  const { user_id, role_id } = req.user;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ 
      msg: "ID de paseo inválido", 
      error: true 
    });
  }

  try {
    // 1. Verificar existencia del paseo y permisos primero
    const basicWalk = await walk.findByPk(id, {
      attributes: ['walk_id', 'client_id', 'walker_id', 'status', 'walk_type_id'],
      include: [{
        model: walk_type,
        as: "walk_type",
        attributes: ["name"]
      }]
    });

    if (!basicWalk) {
      return res.status(404).json({
        msg: "Paseo no encontrado",
        error: true,
      });
    }

    // 2. Validar permisos
    const canAccess = (
      role_id === 1 || // Admin
      (role_id === 3 && basicWalk.client_id === user_id) || // Dueño
      (role_id === 2 && (basicWalk.walker_id === user_id || 
                        (basicWalk.status === "pendiente" && !basicWalk.walker_id))) // Paseador
    );

    if (!canAccess) {
      return res.status(403).json({
        msg: "No tienes permiso para ver este paseo",
        error: true,
      });
    }

    // 3. Obtener datos completos con manejo seguro de asociaciones
    const fullWalk = await walk.findByPk(id, {
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
          required: false
        },
        {
          model: walk_type,
          as: "walk_type",
          attributes: ["walk_type_id", "name"],
        },
        {
          model: days_walk,
          as: "days",
          attributes: ["start_date", "start_time", "duration"],
        }
      ]
    });

    // 4. Obtener mascotas por separado para evitar problemas de asociación
    const petWalks = await pet_walk.findAll({
      where: { walk_id: id },
      include: [{
        model: pet,
        as: "pet",
        attributes: ["pet_id", "name", "photo", "zone"]
      }]
    });

    // 5. Construir respuesta
    const responseData = {
      walk_id: fullWalk.walk_id,
      walk_type: fullWalk.walk_type,
      status: fullWalk.status,
      comments: fullWalk.comments || null,
      client: fullWalk.client || null,
      walker: fullWalk.walker || null,
      pets: petWalks.map(pw => pw.pet).filter(Boolean),
      days: (fullWalk.days || []).map(d => ({
        start_date: d.start_date,
        start_time: d.start_time,
        duration: d.duration
      }))
    };

    return res.json({
      msg: "Paseo obtenido exitosamente",
      data: responseData,
      error: false,
    });

  } catch (error) {
    console.error("Error en get_walk_by_id:", {
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      msg: "Error al obtener el paseo",
      error: true,
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          error: error.name,
          suggestion: "Verifique las asociaciones entre los modelos walk y pet_walk"
        }
      })
    });
  }
};

module.exports = {
  create_walk,
  get_all_walks,
  get_available_walks,
  get_walk_by_id,
};
