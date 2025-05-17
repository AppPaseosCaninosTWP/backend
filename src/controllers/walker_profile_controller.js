const validator       = require("validator");
const { walker_profile, user } = require("../models/database");

const ALLOWED_IMAGE_MIMETYPES = ["image/jpeg", "image/png"];

const create_walker_profile = async (req, res) => {
  try {
    const {
      walker_id,
      name,
      experience,
      walker_type,
      zone,
      photo,
      description,
    } = req.body;

    const existing_user = await user.findByPk(walker_id);
    if (!existing_user || existing_user.role_id !== 3) {
      return res
        .status(400)
        .json({ msg: "usuario inválido o no es paseador", error: true });
    }

    const profile_exists = await walker_profile.findByPk(walker_id);
    if (profile_exists) {
      return res
        .status(409)
        .json({ msg: "el paseador ya tiene un perfil", error: true });
    }

    const profile = await walker_profile.create({
      walker_id,
      name,
      experience,
      walker_type,
      zone,
      photo,
      description,
    });

    res.status(201).json({
      msg: "perfil de paseador creado exitosamente",
      data: profile,
      error: false,
    });
  } catch (error) {
    console.error("error en create_walker_profile:", error);
    res.status(500).json({ msg: "error en el servidor", error: true });
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
    const profile = await walker_profile.findByPk(id);

    if (!profile) {
      return res.status(404).json({ msg: "perfil no encontrado", error: true });
    }

    if (req.user.role_id !== 1 && req.user.user_id != id) {
      return res.status(403).json({ msg: "acceso denegado", error: true });
    }

    res.json({
      msg: "perfil encontrado exitosamente",
      data: profile,
      error: false,
    });
  } catch (error) {
    console.error("error en get_profile_by_id:", error);
    res.status(500).json({ msg: "error en el servidor", error: true });
  }
};

const update_walker_profile = async (req, res) => {
  try {
    const { id }       = req.params;
    const auth_user_id = req.user.user_id;
    const auth_role_id = req.user.role_id;

    // 1) Recuperar el perfil
    const profile = await walker_profile.findByPk(id);
    if (!profile) {
      return res.status(404).json({ msg: "Perfil no encontrado", error: true });
    }

    // 2) Autorización
    if (
      auth_role_id !== 1 &&
      !(auth_role_id === 2 && profile.walker_id === auth_user_id)
    ) {
      return res.status(403).json({ msg: "Acceso denegado", error: true });
    }

    // 3) Validar foto (si viene nueva)
    let photo_filename = profile.photo;
    if (req.file) {
      const { mimetype, filename } = req.file;
      if (!ALLOWED_IMAGE_MIMETYPES.includes(mimetype)) {
        return res
          .status(400)
          .json({ msg: "La fotografía debe ser JPEG o PNG", error: true });
      }
      photo_filename = filename;
    }

    // 4) Cargar user para email/phone
    const user_record = await user.findByPk(profile.walker_id);

    // 5) Validar email (si viene)
    let email_input = user_record.email;
    if (req.body.email !== undefined) {
      email_input = req.body.email.trim();
      if (!validator.isEmail(email_input)) {
        return res
          .status(400)
          .json({ msg: "Correo electrónico inválido", error: true });
      }
    }

    // 6) Validar teléfono (si viene)
    let phone_input = user_record.phone;
    if (req.body.phone !== undefined) {
      phone_input = req.body.phone.trim();
      if (!validator.isMobilePhone(phone_input, "any")) {
        return res
          .status(400)
          .json({ msg: "Teléfono inválido", error: true });
      }
    }

    // 7) Validar descripción
    const description_input = (req.body.description ?? profile.description).trim();
    if (!description_input) {
      return res
        .status(400)
        .json({ msg: "La descripción es obligatoria", error: true });
    }
    if (description_input.length > 250) {
      return res
        .status(400)
        .json({ msg: "La descripción no puede exceder 250 caracteres", error: true });
    }

    // 8) Guardar en User
    user_record.email = email_input;
    user_record.phone = phone_input;
    await user_record.save();

    // 9) Guardar en WalkerProfile
    profile.photo       = photo_filename;
    profile.description = description_input;
    profile.on_review   = true;        // marcar pendiente
    await profile.save();

    return res.json({
      msg:   "Perfil actualizado y pendiente de aprobación",
      data:  profile,
      error: false
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
