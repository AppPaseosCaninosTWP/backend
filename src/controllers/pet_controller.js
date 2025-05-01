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

    const owner_id = req.user.user_id;

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
      msg: "mascota registrada exitosamente",
      data: new_pet,
      error: false,
    });
  } catch (error) {
    console.error("error en create_pet:", error);
    res.status(500).json({ msg: "error en el servidor", error: true });
  }
};

module.exports = {
  create_pet,
  get_pets,
  get_pet_by_id,
  update_pet,
};
