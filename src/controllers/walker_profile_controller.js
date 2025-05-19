const validator = require("validator");
const { walker_profile, user } = require("../models/database");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const ALLOWED_IMAGE_MIMETYPES = ["image/jpeg", "image/png"];

const create_walker_profile = async (req, res) => {
  try {
    if (req.user.role_id !== 1) {
      return res.status(403).json({ msg: "Acción no permitida", error: true });
    }

    let {
      name,
      email,
      phone,
      password,
      experience,
      walker_type,
      zone,
      photo,
      description,
    } = req.body;

    // Validaciones básicas
    if (
      !name ||
      !email ||
      !phone ||
      !password ||
      !experience ||
      !walker_type ||
      !zone ||
      !photo
    ) {
      return res
        .status(400)
        .json({
          msg: "Todos los campos obligatorios deben completarse",
          error: true,
        });
    }

    if (!validator.isEmail(email)) {
      return res
        .status(400)
        .json({ msg: "Correo electrónico inválido", error: true });
    }

    if (!/^\d{9}$/.test(phone)) {
      return res
        .status(400)
        .json({
          msg: "El teléfono debe tener 9 dígitos numéricos",
          error: true,
        });
    }

    if (description && description.length > 250) {
      return res
        .status(400)
        .json({
          msg: "La descripción no puede exceder 250 caracteres",
          error: true,
        });
    }

    // Verificar duplicados
    const exists = await user.findOne({
      where: { [Op.or]: [{ email }, { phone }] },
    });
    if (exists) {
      return res
        .status(409)
        .json({ msg: "Email o teléfono ya registrado", error: true });
    }

    // Crear usuario
    const hashed_password = await bcrypt.hash(password, 10);
    const new_user = await user.create({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password: hashed_password,
      role_id: 2, // Paseador
    });

    // Crear perfil de paseador
    const profile = await walker_profile.create({
      walker_id: new_user.user_id,
      experience,
      walker_type,
      zone,
      photo,
      description: description?.trim(),
    });

    return res.status(201).json({
      msg: "Usuario paseador y perfil creados exitosamente",
      data: {
        user: {
          user_id: new_user.user_id,
          name: new_user.name,
          email: new_user.email,
          phone: new_user.phone,
        },
        profile,
      },
      error: false,
    });
  } catch (err) {
    console.error("Error en create_walker_profile:", err);
    return res.status(500).json({ msg: "Error en el servidor", error: true });
  }
};

const get_all_profiles = async (req, res) => {
  try {
    const profiles = await walker_profile.findAll();
    res.json({
      msg: "perfiles de paseadores obtenidos exitosamente",
      data: profiles,
      error: false,
    });
  } catch (error) {
    console.error("error en get_all_profiles:", error);
    res.status(500).json({ msg: "error en el servidor", error: true });
  }
};

const get_profile_by_id = async (req, res) => {
  try {
    const { id } = req.params;

    // 1) Recuperar perfil e incluir datos del Usuario
    const profile = await walker_profile.findByPk(id, {
      include: {
        model: user,
        as: "user",
        attributes: ["name", "email", "phone"]
      }
    });
    if (!profile) {
      return res
        .status(404)
        .json({ msg: "Perfil no encontrado", error: true });
    }

    const { role_id, user_id: authUserId } = req.user;

    // 2) Autorización
    // - Admin (role_id === 1): puede ver cualquier perfil
    // - Paseador (role_id === 2): sólo su propio perfil
    if (
      role_id !== 1 &&                                 // no es admin
      !(role_id === 2 && profile.walker_id === authUserId)  // ni es paseador sobre su perfil
    ) {
      return res
        .status(403)
        .json({ msg: "Acceso denegado", error: true });
    }

    // 3) Formatear respuesta
    const result = {
      walker_id:   profile.walker_id,
      name:        profile.user.name,
      email:       profile.user.email,
      phone:       profile.user.phone,
      experience:  profile.experience,
      walker_type: profile.walker_type,
      zone:        profile.zone,
      photo:       profile.photo,
      description: profile.description,
      balance:     profile.balance,
      on_review:   profile.on_review
    };

    return res.json({
      msg:   "Perfil encontrado exitosamente",
      data:  result,
      error: false
    });
  } catch (error) {
    console.error("Error en get_profile_by_id:", error);
    return res
      .status(500)
      .json({ msg: "Error en el servidor", error: true });
  }
};

const update_walker_profile = async (req, res) => {
  try {
    const { id }       = req.params;
    const auth_user_id = req.user.user_id;
    const auth_role_id = req.user.role_id;

    // 1) Recuperar perfil
    const profile = await walker_profile.findByPk(id);
    if (!profile) {
      return res.status(404).json({ msg: "Perfil no encontrado", error: true });
    }

    // 2) Autorización: admin o propio paseador
    if (
      auth_role_id !== 1 &&
      !(auth_role_id === 2 && profile.walker_id === auth_user_id)
    ) {
      return res.status(403).json({ msg: "Acceso denegado", error: true });
    }

    // 3) Procesar foto (si se envía nueva)
    if (req.file) {
      const { mimetype, filename } = req.file;
      if (!ALLOWED_IMAGE_MIMETYPES.includes(mimetype)) {
        return res
          .status(400)
          .json({ msg: "La fotografía debe ser JPEG o PNG", error: true });
      }
      profile.photo = filename;
    }

    // 4) Cargar registro de usuario para email/phone
    const user_record = await user.findByPk(profile.walker_id);

    // 5) Validar y aplicar email (si viene)
    if (req.body.email !== undefined) {
      const email = req.body.email.trim();
      if (!validator.isEmail(email)) {
        return res
          .status(400)
          .json({ msg: "Correo electrónico inválido", error: true });
      }
      user_record.email = email;
    }

    // 6) Validar y aplicar teléfono (si viene)
    if (req.body.phone !== undefined) {
      const phone = req.body.phone.trim();
      if (!validator.isMobilePhone(phone, "any")) {
        return res
          .status(400)
          .json({ msg: "Teléfono inválido", error: true });
      }
      user_record.phone = phone;
    }

    // 7) Validar y aplicar descripción (si viene)
    if (req.body.description !== undefined) {
      const description = req.body.description.trim();
      if (!description) {
        return res
          .status(400)
          .json({ msg: "La descripción no puede quedar vacía", error: true });
      }
      if (description.length > 250) {
        return res
          .status(400)
          .json({ msg: "La descripción no puede exceder 250 caracteres", error: true });
      }
      profile.description = description;
    }

    // 8) Guardar cambios
    await user_record.save();
    profile.on_review = true;  // volver a marcar pendiente
    await profile.save();

    return res.json({
      msg:   "Perfil actualizado y pendiente de aprobación",
      data:  profile,
      error: false,
    });
  } catch (err) {
    console.error("Error en update_walker_profile:", err);
    return res
      .status(500)
      .json({ msg: "Error en el servidor", error: true });
  }
};

module.exports = {
  create_walker_profile,
  get_all_profiles,
  get_profile_by_id,
  update_walker_profile,
};
