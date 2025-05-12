const { pet } = require("../models/database");

const create_pet = async (req, res) => {
  try {
    const {
      name,
      breed,
      age,
      zone,
      description,
      comments,
      medical_condition,
      photo,
    } = req.body;

    const owner_id = req.user.user_id; // El usuario logueado se obtiene del token

    // Validar campos obligatorios
    if (!name || !age || !zone || !photo) {
      return res.status(400).json({
        msg: "Los campos nombre, edad, sector y fotografía son obligatorios",
        error: true,
      });
    }

    // Validar longitud del nombre
    if (name.length > 25) {
      return res.status(400).json({
        msg: "El nombre no puede exceder los 25 caracteres",
        error: true,
      });
    }

    // Validar longitud de la raza (opcional)
    if (breed && breed.length > 25) {
      return res.status(400).json({
        msg: "La raza no puede exceder los 25 caracteres",
        error: true,
      });
    }

    // Validar longitud de los comentarios (opcional)
    if (comments && comments.length > 250) {
      return res.status(400).json({
        msg: "Los comentarios no pueden exceder los 250 caracteres",
        error: true,
      });
    }

    // Validar edad (número positivo, máximo 20 años)
    if (isNaN(age) || age <= 0 || age > 20) {
      return res.status(400).json({
        msg: "La edad debe ser un número positivo y no mayor a 20 años",
        error: true,
      });
    }

    const new_pet = await pet.create({
      name,
      breed,
      age,
      zone,
      description,
      comments,
      medical_condition,
      photo,
      owner_id,
    });

    res.status(201).json({
      msg: "Mascota registrada exitosamente",
      data: new_pet,
      error: false,
    });
  } catch (error) {
    console.error("Error en create_pet:", error);
    res.status(500).json({ msg: "Error en el servidor", error: true });
  }
};

const get_pets = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const owner_id = req.user.user_id;

    const { count, rows } = await pet.findAndCountAll({
      where: { owner_id },
      limit,
      offset,
    });

    res.json({
      msg: "mascotas obtenidas exitosamente",
      data: rows,
      total: count,
      page,
      limit,
      error: false,
    });
  } catch (error) {
    console.error("error en get_pets:", error);
    res.status(500).json({ msg: "error en el servidor", error: true });
  }
};

const get_pet_by_id = async (req, res) => {
  try {
    const { id } = req.params;
    const owner_id = req.user.user_id;

    const found_pet = await pet.findOne({
      where: { pet_id: id, owner_id },
    });

    if (!found_pet) {
      return res
        .status(404)
        .json({ msg: "mascota no encontrada", error: true });
    }

    res.json({
      msg: "mascota encontrada exitosamente",
      data: found_pet,
      error: false,
    });
  } catch (error) {
    console.error("error en get_pet_by_id:", error);
    res.status(500).json({ msg: "error en el servidor", error: true });
  }
};

const update_pet = async (req, res) => {
  try {
    const { id } = req.params;
    const owner_id = req.user.user_id;

    const found_pet = await pet.findOne({
      where: { pet_id: id, owner_id },
    });

    if (!found_pet) {
      return res
        .status(404)
        .json({ msg: "mascota no encontrada", error: true });
    }

    await found_pet.update(req.body);

    res.json({
      msg: "mascota actualizada exitosamente",
      data: found_pet,
      error: false,
    });
  } catch (error) {
    console.error("error en update_pet:", error);
    res.status(500).json({ msg: "error en el servidor", error: true });
  }
};

module.exports = {
  create_pet,
  get_pets,
  get_pet_by_id,
  update_pet,
};
