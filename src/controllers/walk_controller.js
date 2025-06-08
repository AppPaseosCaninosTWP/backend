const {
  walk,
  user,
  walk_type,
  pet_walk,
  pet,
  days_walk,
  walker_profile,
  payment,
  rating
} = require("../models/database");

const { Op } = require("sequelize");
const { sendNotification } = require("../utils/send_notification");
const dayjs = require("dayjs");
const { generate_days_for_week } = require("../utils/date_service");
const { calculate_payment_amount, defined_prices } = require("../utils/payment_service")

const create_walk = async (req, res) => {
  const {
    walk_type_id,
    pet_ids,
    comments,
    start_time,
    duration,
    days,
    usar_ticket, // boolean opcional que el front puede enviar cuando quiere usar el paseo de prueba
  } = req.body;
  const client_id = req.user.user_id;

  try {
    // —————————————
    // 1) Validar tipo de paseo
    // —————————————
    if (![1, 2, 3].includes(parseInt(walk_type_id))) {
      return res
        .status(400)
        .json({ msg: "Tipo de paseo inválido", error: true });
    }

    // Paseo de PRUEBA (walk_type_id === 3)
    if (parseInt(walk_type_id) === 3) {
      // a) Chequear que el usuario tenga ticket disponible (boolean true)
      const usuario = await user.findByPk(client_id, {
        attributes: ["user_id", "ticket"],
      });

      if (!usuario || usuario.ticket !== true) {
        return res
          .status(403)
          .json({ msg: "No tienes paseo de prueba disponible", error: true });
      }

      // b) Validar que 'days' sea un array de un solo elemento
      if (!Array.isArray(days) || days.length !== 1) {
        return res.status(400).json({
          msg: "Para un paseo de prueba debes indicar exactamente un día",
          error: true,
        });
      }

      // c) Validar formato de hora y duración
      const time_regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!time_regex.test(start_time)) {
        return res
          .status(400)
          .json({ msg: "Formato de hora inválido", error: true });
      }
      if (![30, 60].includes(parseInt(duration))) {
        return res
          .status(400)
          .json({ msg: "Duración inválida", error: true });
      }

      // d) Validar mascotas del cliente
      if (!Array.isArray(pet_ids) || pet_ids.length === 0) {
        return res.status(400).json({
          msg: "Debes seleccionar al menos una mascota",
          error: true,
        });
      }
      const pets = await pet.findAll({
        where: {
          pet_id: { [Op.in]: pet_ids },
          owner_id: client_id,
        },
      });
      if (pets.length !== pet_ids.length) {
        return res.status(404).json({
          msg: "Una o más mascotas no existen o no te pertenecen",
          error: true,
        });
      }

      // e) Calcular el monto del paseo de prueba (igual que un esporádico),
      //    pero no cobrar al cliente ahora. La idea es que el paseador reciba
      //    el pago después de completarlo.
      const num_pets = pet_ids.length;
      const num_days = 1;
      const amount = calculate_payment_amount({
        duration: parseInt(duration),
        num_pets,
        num_days,
      });

      // f) Crear todo dentro de una transacción
      const transaction = await walk.sequelize.transaction();
      try {
        // 1) Crear registro en 'walk'
        const new_walk = await walk.create(
          {
            walk_type_id, // 3 (prueba)
            client_id,
            comments: comments || null,
            status: "pendiente",
          },
          { transaction }
        );

        // 2) Insertar el único día para este paseo de prueba
        const day_map = {
          lunes: 1,
          martes: 2,
          miercoles: 3,
          jueves: 4,
          viernes: 5,
          sabado: 6,
          domingo: 7,
        };
        let start_date = dayjs().startOf("day");
        const target_day = day_map[days[0].toLowerCase()];
        while (start_date.isoWeekday() !== target_day) {
          start_date = start_date.add(1, "day");
        }
        await days_walk.create(
          {
            walk_id: new_walk.walk_id,
            start_date: start_date.format("YYYY-MM-DD"),
            start_time,
            duration,
          },
          { transaction }
        );

        // 3) Asociar mascotas al paseo
        await Promise.all(
          pet_ids.map((pet_id) =>
            pet_walk.create(
              { walk_id: new_walk.walk_id, pet_id },
              { transaction }
            )
          )
        );

        // 4) Crear registro de pago con el monto calculado, pero estado "pendiente"
        //    Cliente no paga ahora; el paseador recibirá este pago cuando el paseo se complete.
        await payment.create(
          {
            amount, // monto calculado
            date: dayjs().toDate(),
            status: "pendiente",
            walk_id: new_walk.walk_id,
          },
          { transaction }
        );

        // 5) Consumir el ticket del usuario: poner ticket a 0
        await usuario.update({ ticket: 0 }, { transaction });

        await transaction.commit();

        return res.status(201).json({
          msg: "Paseo de prueba creado exitosamente",
          walk_id: new_walk.walk_id,
          error: false,
        });
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    }

    // —————————————
    // 3) Lógica ORIGINAL para Paseo Fijo (1) o Paseo Esporádico (2)
    // —————————————
    if (!Array.isArray(pet_ids) || pet_ids.length === 0) {
      return res
        .status(400)
        .json({ msg: "Debes seleccionar al menos una mascota", error: true });
    }
    const pets = await pet.findAll({
      where: {
        pet_id: { [Op.in]: pet_ids },
        owner_id: client_id,
      },
    });
    if (pets.length !== pet_ids.length) {
      return res.status(404).json({
        msg: "Una o más mascotas no existen o no pertenecen al usuario",
        error: true,
      });
    }

    const valid_days = [
      "lunes",
      "martes",
      "miercoles",
      "jueves",
      "viernes",
      "sabado",
      "domingo",
    ];
    if (!Array.isArray(days) || days.length === 0) {
      return res
        .status(400)
        .json({ msg: "Debes seleccionar al menos un día", error: true });
    }

    if (walk_type_id == 1 && days.length < 2) {
      return res.status(400).json({
        msg: "Un paseo fijo requiere al menos 2 días",
        error: true,
      });
    }

    if (walk_type_id == 2 && days.length !== 1) {
      return res.status(400).json({
        msg: "Un paseo esporádico debe tener exactamente 1 día",
        error: true,
      });
    }

    const time_regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!time_regex.test(start_time)) {
      return res
        .status(400)
        .json({ msg: "Formato de hora inválido", error: true });
    }

    if (![30, 60].includes(parseInt(duration))) {
      return res.status(400).json({ msg: "Duración inválida", error: true });
    }

    if (comments && comments.length > 250) {
      return res
        .status(400)
        .json({ msg: "Comentarios muy largos", error: true });
    }

    const transaction = await walk.sequelize.transaction();

    try {
      const new_walk = await walk.create(
        { walk_type_id, client_id, comments, status: "pendiente" },
        { transaction }
      );

      let days_to_insert = [];
      const day_map = {
        lunes: 1,
        martes: 2,
        miercoles: 3,
        jueves: 4,
        viernes: 5,
        sabado: 6,
        domingo: 7,
      };

      if (walk_type_id == 1) {
        days_to_insert = generate_days_for_week(days, start_time, duration);
      } else {
        let start_date = dayjs().startOf("day");
        const target_day = day_map[days[0].toLowerCase()];
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

      await Promise.all(
        days_to_insert.map((day) =>
          days_walk.create({ walk_id: new_walk.walk_id, ...day }, { transaction })
        )
      );

      await Promise.all(
        pet_ids.map((pet_id) =>
          pet_walk.create({ walk_id: new_walk.walk_id, pet_id }, { transaction })
        )
      );

      // Calcular monto normalmente y crear pago "pendiente"
      const amount = calculate_payment_amount({
        duration: parseInt(duration),
        num_pets: pet_ids.length,
        num_days: days.length,
      });

      await payment.create(
        {
          amount,
          date: dayjs().toDate(),
          status: "pendiente",
          walk_id: new_walk.walk_id,
        },
        { transaction }
      );

      await transaction.commit();

      return res.status(201).json({
        msg: "Paseo creado exitosamente",
        walk_id: new_walk.walk_id,
        error: false,
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Error en create_walk:", err);
    return res
      .status(500)
      .json({ msg: "Error al crear el paseo", error: true });
  }
};

const get_all_walks = async (req, res) => {
  const { user_id, role_id } = req.user;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    let allWalks = [];

    if (role_id === 3) {
      // Cliente: solo ve sus propios paseos
      allWalks = await walk.findAll({
        where: { client_id: user_id },
        include: [
          { model: user, as: "client", attributes: ["email"] },
          { model: user, as: "walker", attributes: ["email"] },
          { model: walk_type, as: "walk_type", attributes: ["name"] },
          { model: days_walk, as: "days" },
          {
            model: pet,
            as: "pets",
            through: { attributes: [] },
            attributes: ["pet_id", "name", "photo", "zone"],
          },
        ],
        order: [["walk_id", "DESC"]],
      });

    } else if (role_id === 2) {
      // Paseador: filtrar por zona de su perfil + sus paseos asignados
      const walkerProfile = await walker_profile.findOne({
        where: { walker_id: user_id },
      });
      if (!walkerProfile) {
        return res.status(404).json({
          msg: "Perfil de paseador no encontrado",
          error: true,
        });
      }

      const walkerZone = walkerProfile.zone;

      // Obtenemos todos los paseos que estén asignados a él o pendientes
      const rawWalks = await walk.findAll({
        where: {
          [Op.or]: [
            { walker_id: user_id },
            { status: "pendiente", walker_id: null },
          ],
        },
        include: [
          { model: user, as: "client", attributes: ["email"] },
          { model: user, as: "walker", attributes: ["email"] },
          { model: walk_type, as: "walk_type", attributes: ["name"] },
          { model: days_walk, as: "days" },
          {
            model: pet,
            as: "pets",
            through: { attributes: [] },
            attributes: ["pet_id", "name", "photo", "zone"],
          },
        ],
        order: [["walk_id", "DESC"]],
      });

      // Filtrar en memoria para que un paseador solo vea:
      // - sus propios paseos (walker_id === user_id)
      // - o paseos pendientes donde al menos una mascota esté en su zona
      allWalks = rawWalks.filter((w) => {
        return (
          w.walker_id === user_id ||
          (w.status === "pendiente" &&
            w.walker_id === null &&
            w.pets.some((pet) => pet.zone === walkerZone))
        );
      });

    } else {
      allWalks = await walk.findAll({
        include: [
          { model: user, as: "client", attributes: ["email"] },
          { model: user, as: "walker", attributes: ["email"] },
          { model: walk_type, as: "walk_type", attributes: ["name"] },
          { model: days_walk, as: "days" },
          {
            model: pet,
            as: "pets",
            through: { attributes: [] },
            attributes: ["pet_id", "name", "photo", "zone"],
          },
        ],
        order: [["walk_id", "DESC"]],
      });
    }

    const total = allWalks.length;
    const paginated = allWalks.slice(offset, offset + limit);

    const data = paginated.map((walk_record) => ({
      walk_id: walk_record.walk_id,
      walk_type: walk_record.walk_type?.name,
      status: walk_record.status,
      client_email: walk_record.client?.email,
      walker_email: walk_record.walker?.email ?? null,
      payment_status: walk_record.payment_status,
      walker_id: walk_record.walker_id,   
      is_rated: walk_record.is_rated,             
      days:
        walk_record.days?.map((day) => ({
          start_date: day.start_date,
          start_time: day.start_time,
          duration: day.duration,
        })) ?? [],
      pets:
        walk_record.pets?.map((pet) => ({
          pet_id: pet.pet_id,
          name: pet.name,
          photo: pet.photo,
          zone: pet.zone,
        })) ?? [],
    }));

    return res.json({
      msg: "Paseos obtenidos exitosamente",
      data,
      total,
      page,
      limit,
      error: false,
    });
  } catch (err) {
    console.error("Error en get_all_walks:", err);
    return res.status(500).json({ msg: "Error en el servidor", error: true });
  }
};

const get_walk_by_id = async (req, res) => {
  const { id } = req.params;
  const { user_id, role_id } = req.user;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ msg: "ID de paseo inválido", error: true });
  }

  try {
    const basic_walk = await walk.findByPk(id, {
      attributes: ["walk_id", "client_id", "walker_id", "status", "walk_type_id", "comments"],
      include: [
        { model: walk_type, as: "walk_type", attributes: ["name"] },
      ],
    });

    if (!basic_walk) {
      return res.status(404).json({ msg: "Paseo no encontrado", error: true });
    }

    const can_access =
      role_id === 1 ||
      (role_id === 3 && basic_walk.client_id === user_id) ||
      (role_id === 2 && (basic_walk.walker_id === user_id || (!basic_walk.walker_id && basic_walk.status === "pendiente")));

    if (!can_access) {
      return res.status(403).json({ msg: "No tienes permiso para ver este paseo", error: true });
    }

    const full_walk = await walk.findByPk(id, {
      include: [
        { model: user, as: "client", attributes: ["user_id", "email", "phone"] },
        { model: user, as: "walker", attributes: ["user_id", "email", "phone"], required: false },
        { model: walk_type, as: "walk_type", attributes: ["walk_type_id", "name"] },
        { model: days_walk, as: "days", attributes: ["start_date", "start_time", "duration"] },
      ],
    });

    const pet_walks = await pet_walk.findAll({
      where: { walk_id: id },
      include: [
        { model: pet, as: "pet", attributes: ["pet_id", "name", "photo", "zone"] },
      ],
    });

    const response_data = {
      walk_id: full_walk.walk_id,
      walk_type: full_walk.walk_type,
      status: full_walk.status,
      comments: full_walk.comments || null,
      client: full_walk.client || null,
      walker: full_walk.walker || null,
      pets: pet_walks.map((pw) => pw.pet).filter(Boolean),
      days: (full_walk.days || []).map((day) => ({
        start_date: day.start_date,
        start_time: day.start_time,
        duration: day.duration,
      })),
    };

    return res.json({ msg: "Paseo obtenido exitosamente", data: response_data, error: false });
  } catch (err) {
    console.error("Error en get_walk_by_id:", err);
    return res.status(500).json({ msg: "Error al obtener el paseo", error: true });
  }
};

const get_walk_history = async (req, res) => {
  try {
    const walker_id = req.user.user_id;
    const walks = await walk.findAll({
      where: { status: "finalizado", walker_id },
      include: [
        { model: pet, as: "pets", through: { attributes: [] }, attributes: ["pet_id", "name", "photo", "zone"] },
        { model: walk_type, as: "walk_type", attributes: ["name"] },
        { model: days_walk, as: "days", attributes: ["start_date", "start_time", "duration"], where: { start_date: { [Op.lte]: dayjs().format("YYYY-MM-DD") } } },
      ],
      order: [["walk_id", "DESC"]],
    });

    const base_url = `${req.protocol}://${req.get("host")}/api/uploads`;
    const data = walks.map((walk_record) => {
      const day = walk_record.days[0] || {};
      const pet_data = walk_record.pets[0] || {};
      return {
        walk_id: walk_record.walk_id,
        date: day.start_date,
        time: day.start_time,
        duration: day.duration,
        zone: pet_data.zone,
        label: walk_record.walk_type.name,
        pet_name: pet_data.name,
        pet_photo: pet_data.photo ? `${base_url}/${pet_data.photo}` : null,
      };
    });

    return res.json({ msg: "Historial cargado", data, error: false });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Error en servidor", error: true });
  }
};

const get_walk_assigned = async (req, res) => {
  try {
    const walker_id = req.user.user_id;
    const walks = await walk.findAll({
      where: { walker_id, status: "confirmado" },
      include: [
        {
          model: pet,
          as: "pets",
          through: { attributes: [] },
          attributes: ["pet_id", "name", "photo", "zone"],
        },
        {
          model: days_walk,
          as: "days",
          attributes: ["start_date", "start_time", "duration"],
          where: { start_date: { [Op.gte]: dayjs().format("YYYY-MM-DD") } },
        },
      ],
      order: [["walk_id", "DESC"]],
    });

    const data = walks.map((walk_record) => {
      const pet_data = walk_record.pets[0] || {};
      const day = walk_record.days[0] || {};
      return {
        walk_id: walk_record.walk_id,
        pet_id: pet_data.pet_id,
        pet_name: pet_data.name,
        pet_photo: pet_data.photo,
        zone: pet_data.zone,
        time: day.start_time,
        date: day.start_date,
        duration: day.duration,
      };
    });

    return res.json({ msg: "Paseos asignados", data, error: false });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Error en el servidor", error: true });
  }
};

const update_walk_status = async (req, res) => {
  const { id } = req.params;
  const { new_status, walker_rating, client_rating } = req.body;
  const { user_id } = req.user;

  const valid_statuses = ["confirmado", "cancelado", "en_curso", "finalizado"];
  if (!valid_statuses.includes(new_status)) {
    return res.status(400).json({ msg: "Estado inválido", error: true });
  }

  try {
    const walk_record = await walk.findByPk(id);
    if (!walk_record) {
      return res.status(404).json({ msg: "Paseo no encontrado", error: true });
    }

    if (new_status === "confirmado") {
      if (walk_record.status !== "pendiente") {
        return res
          .status(400)
          .json({ msg: "Solo paseos pendientes pueden confirmarse", error: true });
      }
      await walk_record.update({ status: "confirmado", walker_id: user_id });

    } else if (new_status === "cancelado") {
      const walk_day = await days_walk.findOne({
        where: { walk_id: id },
        order: [["start_date", "ASC"]],
      });
      const now = dayjs();
      const walk_datetime = dayjs(`${walk_day.start_date} ${walk_day.start_time}`);
      const diff_minutes = walk_datetime.diff(now, "minute");

      if (diff_minutes < 30) {
        return res
          .status(400)
          .json({
            msg: "No se puede cancelar con menos de 30 minutos de anticipación",
            error: true,
          });
      }
      await walk_record.update({ status: "pendiente", walker_id: null });

    } else if (new_status === "en_curso") {
      await walk_record.update({ status: "en_curso" });

    } else if (new_status === "finalizado") {
      // 1) VALIDACIONES de rating/comentario: si viene uno, debe venir el otro
      if (walker_rating) {
        if (
          walker_rating.value == null ||
          !walker_rating.comment ||
          walker_rating.comment.trim() === ""
        ) {
          return res
            .status(400)
            .json({ msg: "Comentario obligatorio para rating", error: true });
        }
      }
      if (client_rating) {
        if (
          client_rating.value == null ||
          !client_rating.comment ||
          client_rating.comment.trim() === ""
        ) {
          return res
            .status(400)
            .json({ msg: "Comentario obligatorio para rating", error: true });
        }
      }

      // 2) Marco como finalizado **solo si pasaron validaciones**
      await walk_record.update({ status: "finalizado" });

      // 3) Creo calificaciones
      const tasks = [];
      if (walker_rating) {
        tasks.push(
          rating.create({
            value:       walker_rating.value,
            comment:     walker_rating.comment,
            sender_id:   user_id,
            receiver_id: walk_record.client_id,
            walk_id:     walk_record.walk_id,
          })
        );
      }
      if (client_rating) {
        tasks.push(
          rating.create({
            value:       client_rating.value,
            comment:     client_rating.comment,
            sender_id:   walk_record.client_id,
            receiver_id: user_id,
            walk_id:     walk_record.walk_id,
          })
        );
      }
      await Promise.all(tasks);
    }

    return res.json({ msg: `Paseo ${new_status}`, error: false });

  } catch (err) {
    console.error("Error en update_walk_status:", err);
    return res
      .status(500)
      .json({ msg: "Error al actualizar el estado del paseo", error: true });
  }
};

module.exports = {
  create_walk,
  get_all_walks,
  get_walk_by_id,
  get_walk_history,
  get_walk_assigned,
  update_walk_status,
};