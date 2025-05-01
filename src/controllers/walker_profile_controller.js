const { walker_profile, user } = require("../models/database");

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
      const { id } = req.params;
      const profile = await walker_profile.findByPk(id);
  
      if (!profile) {
        return res
          .status(404)
          .json({ msg: "perfil no encontrado", error: true });
      }
  
      if (req.user.role_id !== 1 && req.user.user_id != id) {
        return res
          .status(403)
          .json({ msg: "acceso denegado", error: true });
      }
  
      await profile.update(req.body);
  
      res.json({
        msg: "perfil actualizado exitosamente",
        data: profile,
        error: false,
      });
    } catch (error) {
      console.error("error en update_walker_profile:", error);
      res.status(500).json({ msg: "error en el servidor", error: true });
    }
  };

module.exports = {
  create_walker_profile,
  get_all_profiles,
  get_profile_by_id,
  update_walker_profile,
};
