const bcrypt    = require("bcryptjs");
const validator = require("validator");
const { Op }    = require("sequelize");
const fs        = require("fs");
const path      = require("path");

const { user, walker_profile } = require("../models/database");

const ALLOWED_ZONES        = ["norte","centro","sur"];
const ALLOWED_WALKER_TYPES = ["esporádico","fijo"];

const { send_email }       = require("../utils/email_service");
const { sendNotification } = require("../utils/send_notification");

const create_walker_profile = async (req, res) => {
  try {
    // 1) Desestructurar y sanitizar
    let {
      name,
      email,
      phone,
      password,
      confirm_password,
      experience,
      walker_type,
      zone,
      description = ""
    } = req.body;

    name             = validator.trim(name   || "");
    email            = validator.trim(email  || "");
    phone            = validator.trim(phone  || "");
    password         = validator.trim(password || "");
    confirm_password = validator.trim(confirm_password || "");
    experience       = Number(experience);
    walker_type      = (walker_type || "").trim().toLowerCase();
    zone             = (zone        || "").trim().toLowerCase();
    description      = description.trim();

    // 2) Validaciones básicas (mismas que register_user)
    if (!name || name.length > 50) {
      return res.status(400).json({ error:true, msg:"El nombre es obligatorio y ≤50 caracteres" });
    }
    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ error:true, msg:"Email inválido" });
    }
    if (!/^\d{9}$/.test(phone)) {
      return res.status(400).json({ error:true, msg:"El teléfono debe tener 9 dígitos" });
    }
    if (password.length < 8 || password.length > 15) {
      return res.status(400).json({ error:true, msg:"Contraseña 8–15 caracteres" });
    }
    if (password !== confirm_password) {
      return res.status(400).json({ error:true, msg:"Las contraseñas no coinciden" });
    }

    // 3) Campos obligatorios de paseador
    if (!req.file) {
      return res.status(400).json({ error:true, msg:"Foto de perfil obligatoria" });
    }
    if (isNaN(experience) || experience < 1 || experience > 99) {
      return res.status(400).json({ error:true, msg:"Experiencia debe ser entero 1–99" });
    }
    if (!ALLOWED_WALKER_TYPES.includes(walker_type)) {
      return res.status(400).json({ error:true, msg:"Tipo inválido: esporádico o fijo" });
    }
    if (!ALLOWED_ZONES.includes(zone)) {
      return res.status(400).json({ error:true, msg:"Zona inválida: norte, centro o sur" });
    }
    if (description && (description.length > 250)) {
      return res.status(400).json({ error:true, msg:"Descripción 50–250 caracteres" });
    }

    // 4) Unicidad de email/teléfono
    const exists = await user.findOne({
      where: { [Op.or]: [{ email }, { phone }] }
    });
    if (exists) {
      return res.status(400).json({ error:true, msg:"Email o teléfono ya registrado" });
    }

    // 5) Crear usuario con role_id = 2 (paseador)
    const hashed = await bcrypt.hash(password, 10);
    const newUser = await user.create({
      name, email, phone, password: hashed, role_id: 2
    });

    // 6) Renombrar imagen con su extensión real
    const ext      = path.extname(req.file.originalname).toLowerCase();
    const filename = `${req.file.filename}${ext}`;
    fs.renameSync(
      path.join("uploads", req.file.filename),
      path.join("uploads", filename)
    );

    // 7) Crear perfil de paseador
    const profile = await walker_profile.create({
      walker_id:   newUser.user_id,
      experience,
      walker_type: walker_type[0].toUpperCase() + walker_type.slice(1),
      zone:        zone[0].toUpperCase() + zone.slice(1),
      photo:       filename,
      description
    });

    // 8) Respuesta
    return res.status(201).json({
      error: false,
      msg:   "Paseador registrado correctamente",
      data:  { user: newUser, profile }
    });

  } catch (err) {
    console.error("Error en create_walker_profile:", err);
    return res.status(500).json({ error:true, msg:"Error de servidor" });
  }
};

const get_all_profiles = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await walker_profile.findAndCountAll({
      offset,
      limit,
      include: {
        model: user,
        as: "user",
        attributes: ["name", "email", "phone"]
      }
    });

    const baseUrl = `${req.protocol}://${req.get("host")}/uploads`;

    const data = rows.map(p => ({
      walker_id:   p.walker_id,
      name:        p.user.name,
      email:       p.user.email,
      phone:       p.user.phone,
      experience:  p.experience,
      walker_type: p.walker_type,
      zone:        p.zone,
      description: p.description,
      balance:     p.balance,
      on_review:   p.on_review,
      photo:       p.photo,
      photoUrl:    `${baseUrl}/${p.photo}`
    }));

    return res.json({
      msg:   "Perfiles obtenidos exitosamente",
      data,
      pagination: {
        total: count,
        page,
        per_page: limit,
        total_pages: Math.ceil(count / limit)
      },
      error: false
    });
  } catch (error) {
    console.error("error en get_all_profiles:", error);
    return res.status(500).json({ msg:"error en el servidor", error:true });
  }
};

const get_profile_by_id = async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await walker_profile.findByPk(id, {
      include: {
        model: user,
        as: "user",
        attributes: ["name","email","phone"]
      }
    });
    if (!profile) {
      return res.status(404).json({ msg:"Perfil no encontrado", error:true });
    }

    // Autorización (admin o propio paseador)
    const { role_id, user_id: authUserId } = req.user;
    if (
      role_id !== 1 &&
      !(role_id === 2 && profile.walker_id === authUserId)
    ) {
      return res.status(403).json({ msg:"Acceso denegado", error:true });
    }

    //  Formatear y añadir photoUrl
    const baseUrl = `${req.protocol}://${req.get("host")}/uploads`;
    const result = {
      walker_id:   profile.walker_id,
      name:        profile.user.name,
      email:       profile.user.email,
      phone:       profile.user.phone,
      experience:  profile.experience,
      walker_type: profile.walker_type,
      zone:        profile.zone,
      photo:       profile.photo,
      photoUrl:    `${baseUrl}/${profile.photo}`,
      description: profile.description,
      balance:     profile.balance,
      on_review:   profile.on_review
    };

    return res.json({
      msg:  "Perfil encontrado exitosamente",
      data: result,
      error:false
    });
  } catch (error) {
    console.error("Error en get_profile_by_id:", error);
    return res.status(500).json({ msg:"Error en el servidor", error:true });
  }
};

const update_walker_profile = async (req, res) => {
  try {
    const { id }       = req.params;
    const { user_id: authUserId, role_id: authRoleId } = req.user;
    const uploadDir    = path.join(__dirname, "../../uploads");

    // 1) Sólo paseador puede llamar aquí
    if (authRoleId !== 2) {
      return res.status(403).json({ msg: "Acceso denegado", error: true });
    }

    // 2) Recuperar perfil
    const profile = await walker_profile.findByPk(id);
    if (!profile || profile.walker_id !== authUserId) {
      return res.status(404).json({ msg: "Perfil no encontrado", error: true });
    }

    // 3) Construir objeto de cambios pendientes
    const pending = {};

    // 3.1) Foto nueva (si viene)
    if (req.file) {
      const ext     = path.extname(req.file.originalname).toLowerCase();
      const newName = `${req.file.filename}${ext}`;
      fs.renameSync(
        path.join(uploadDir, req.file.filename),
        path.join(uploadDir, newName)
      );
      pending.photo = newName;
    }

    // 3.2) Campos que permitimos solicitar
    ["experience", "walker_type", "zone", "description", "email", "phone"].forEach(field => {
      if (req.body[field] !== undefined) {
        pending[field] = req.body[field].toString().trim();
      }
    });

    // 4) Guardar la petición
    profile.pending_changes   = pending;
    profile.update_requested  = true;
    await profile.save();

    // 5) Responder
    return res.json({
      msg:  "Solicitud de cambio enviada. Pendiente de aprobación",
      data: { walker_id: profile.walker_id },
      error: false
    });

  } catch (err) {
    console.error("Error en update_walker_profile:", err);
    return res.status(500).json({ msg: "Error en el servidor", error: true });
  }
};

const approve_change_request = async (req, res) => {
  const { id } = req.params;
  const p = await walker_profile.findByPk(id, {
    include: [{ model: user, as: "user", attributes: ["user_id","email","name"] }]
  });
  if (!p || !p.update_requested) {
    return res.status(404).json({ msg:"Solicitud no encontrada", error:true });
  }

  const uploadDir = path.join(__dirname, "../../uploads");
  const changes   = p.pending_changes;

  // 1) Foto
  if (changes.photo) {
    const oldPath = path.join(uploadDir, p.photo);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    p.photo = changes.photo;
  }
  // 2) Otros campos
  ["experience","walker_type","zone","description"].forEach(field => {
    if (changes[field] !== undefined) p[field] = changes[field];
  });

  // 3) Reset flags
  p.pending_changes  = null;
  p.update_requested = false;
  await p.save();

  // 4) Notificar y enviar email
  const emailText = "Tus cambios han sido aprobados. ¡Revisa tu perfil!";
  // notificación push / websocket
  sendNotification(p.walker_id, {
    title: "Cambios Aprobados",
    body:  emailText
  });
  // correo
  await send_email(p.user.email, "Cambios aprobados", emailText);

  return res.json({ msg:"Cambios aprobados y aplicados", error:false });
};

const reject_change_request = async (req, res) => {
  const { id } = req.params;
  const p = await walker_profile.findByPk(id, {
    include: [{ model: user, as: "user", attributes: ["user_id","email","name"] }]
  });
  if (!p || !p.update_requested) {
    return res.status(404).json({ msg:"Solicitud no encontrada", error:true });
  }

  // Borrar foto temporal si vino una
  if (p.pending_changes?.photo) {
    const uploadDir = path.join(__dirname, "../../uploads");
    const tmp = path.join(uploadDir, p.pending_changes.photo);
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }

  // Reset flags
  p.pending_changes  = null;
  p.update_requested = false;
  await p.save();

  const emailText = "Tus cambios han sido rechazados. Por favor, revísalos de nuevo.";
  sendNotification(p.walker_id, {
    title: "Cambios Rechazados",
    body:  emailText
  });
  await send_email(p.user.email, "Cambios rechazados", emailText);

  return res.json({ msg:"Solicitud rechazada", error:false });
};

// ── Ver una solicitud concreta ──
const get_change_request_by_id = async (req, res) => {
  const { id } = req.params;
  const p = await walker_profile.findByPk(id, {
    where: { update_requested: true },
    include: [{ model: user, as: "user", attributes: ["user_id","email","name"] }]
  });
  if (!p || !p.update_requested) {
    return res.status(404).json({ msg:"Solicitud no encontrada", error:true });
  }

  const baseUrl = `${req.protocol}://${req.get("host")}/uploads`;
  return res.json({
    msg:"Solicitud encontrada",
    data: {
      walker_id:  p.walker_id,
      name:       p.user.name,
      email:      p.user.email,
      old: {
        experience:  p.experience,
        walker_type: p.walker_type,
        zone:        p.zone,
        photoUrl:    `${baseUrl}/${p.photo}`,
        description: p.description
      },
      pending: p.pending_changes
    },
    error:false
  });
};

// ── Obtener todas las solicitudes pendientes ──
const get_change_requests = async (req, res) => {
  const pending = await walker_profile.findAll({
    where: { update_requested: true },
    include: [{ model: user, as: "user", attributes: ["user_id","email","name"] }]
  });

  const baseUrl = `${req.protocol}://${req.get("host")}/uploads`;
  const data = pending.map(p => ({
    walker_id: p.walker_id,
    name:      p.user.name,
    email:     p.user.email,
    old: {
      experience:  p.experience,
      walker_type: p.walker_type,
      zone:        p.zone,
      photoUrl:    `${baseUrl}/${p.photo}`,
      description: p.description
    },
    pending: p.pending_changes
  }));

  return res.json({ msg:"Solicitudes obtenidas", data, error:false });
};

module.exports = {
  create_walker_profile,
  get_all_profiles,
  get_profile_by_id,
  update_walker_profile,
  approve_change_request,
  reject_change_request,
  get_change_requests,
  get_change_request_by_id
};
