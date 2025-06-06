// src/controllers/pet_controller.js

const { pet, user} = require("../models/database");
const ALLOWED_ZONES = ["norte", "centro", "sur"];

const fs = require('fs');
const path = require('path');

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
    } = req.body;

    const owner_id = req.user.user_id;
    const file = req.file;

    // 1) Campos obligatorios
if (!name || age == null || !zone || !file) {
      return res.status(400).json({
        msg: 'Los campos nombre, edad, sector y fotografía son obligatorios',
        error: true,
      });
    }

    // 2) Validar y formatear 'zone'
    const zone_lower = zone.trim().toLowerCase();
    if (!ALLOWED_ZONES.includes(zone_lower)) {
      return res.status(400).json({
        msg: "Sector inválido. Opciones: norte, centro, sur",
        error: true,
      });
    }
    const zone_formatted = zone_lower[0].toUpperCase() + zone_lower.slice(1);

    // 3) Validar nombre
    if (name.length > 25) {
      return res.status(400).json({
        msg:   "El nombre no puede exceder los 25 caracteres",
        error: true,
      });
    }

    // 4) Validar edad
    const numeric_age = Number(age);
    if (isNaN(numeric_age) || numeric_age <= 0 || numeric_age > 20) {
      return res.status(400).json({
        msg:   "La edad debe ser un número positivo y no mayor a 20 años",
        error: true,
      });
    }

    // 5) Validar raza (opcional)
    if (breed && breed.length > 25) {
      return res.status(400).json({
        msg:   "La raza no puede exceder los 25 caracteres",
        error: true,
      });
    }

    // 6) Validar comentarios (opcional)
    if (comments && comments.length > 250) {
      return res.status(400).json({
        msg:   "Los comentarios no pueden exceder los 250 caracteres",
        error: true,
      });
    }

    // Renombrar archivo con extensión real
    const extension = file.originalname.split('.').pop();
    const filename_with_ext = `${file.filename}.${extension}`;
    const old_path = path.join('uploads', file.filename);
    const new_path = path.join('uploads', filename_with_ext);

    fs.renameSync(old_path, new_path);

    // 7) Crear en BD
    const new_pet = await pet.create({
      name,
      breed,
      age: numeric_age,
      zone: zone_formatted,
      description,
      comments,
      medical_condition,
      photo: filename_with_ext,
      owner_id,
    });

    return res.status(201).json({
      msg:   "Mascota registrada exitosamente",
      data:  new_pet,
      error: false,
    });
  } catch (error) {
    console.error("Error en create_pet:", error);
    return res.status(500).json({
      msg:   "Error en el servidor",
      error: true,
    });
  }
};

const get_pets = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { user_id, role_id } = req.user;
    const requestedOwnerId = Number(req.query.owner_id); // opcional: ID del cliente que admin quiere ver

    let condition = {};

    if (role_id === 3) {
      // DUEÑO: solo puede ver sus propias mascotas (ignora owner_id en query)
      condition.owner_id = user_id;

    } else if (role_id === 1) {
      // ADMIN: 
      if (!isNaN(requestedOwnerId)) {
        // Si envió owner_id en la query, filtra por ese cliente
        condition.owner_id = requestedOwnerId;
      }
      // Si no envió owner_id, condition = {} → verá todas las mascotas
    } else {
      // PASEADOR u otro rol: no autorizado a ver mascotas
      return res.status(403).json({
        msg: "No autorizado para ver mascotas",
        data: [],
        total: 0,
        page,
        limit,
        error: true,
      });
    }

    const { count, rows } = await pet.findAndCountAll({
      where: condition,
      limit,
      offset,
      order: [["pet_id", "ASC"]],
    });

    return res.json({
      msg: "Mascotas obtenidas exitosamente",
      data: rows,
      total: count,
      page,
      limit,
      error: false,
    });
  } catch (error) {
    console.error("Error en get_pets:", error);
    return res
      .status(500)
      .json({ msg: "Error en el servidor", error: true });
  }
};

const get_pet_by_id = async (req, res) => {
  try {
    const { id } = req.params;
    const owner_id = req.user.user_id;
    const whereClause = { pet_id: id };

    if (req.user.role_id === 3) {
      whereClause.owner_id = req.user.user_id;
    }

    const found_pet = await pet.findOne({
       where: whereClause,
  include: [
    {
      model: user,
      as: "owner",
      attributes: ["user_id","name","email","phone"]
    }
  ]
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
    const { user_id, role_id } = req.user;

    // --- Si es ADMIN (role_id === 1) → Solo puede habilitar/deshabilitar ---
    if (role_id === 1) {
      // 1) Verificar que la mascota exista
      const found_pet_admin = await pet.findOne({ where: { pet_id: id } });
      if (!found_pet_admin) {
        return res.status(404).json({ msg: "Mascota no encontrada", error: true });
      }

      // 2) Extraer is_enable del body
      const { is_enable } = req.body;
      if (is_enable === undefined) {
        return res
          .status(400)
          .json({ msg: "Debes indicar is_enable (true o false)", error: true });
      }

      // 3) Validar que sea booleano
      if (typeof is_enable !== "boolean") {
        return res
          .status(400)
          .json({ msg: "is_enable debe ser true o false", error: true });
      }

      // 4) Aplicar actualización (solo is_enable)
      await found_pet_admin.update({ is_enable });
      return res.json({
        msg: "Estado de la mascota actualizado por admin",
        data: { pet_id: found_pet_admin.pet_id, is_enable: found_pet_admin.is_enable },
        error: false,
      });
    }

    // --- Si es DUEÑO (role_id === 3) → Puede editar todos sus campos ---
    if (role_id === 3) {
      const owner_id = user_id;

      // 1) Verificar existencia y que el owner_id coincida
      const found_pet = await pet.findOne({
        where: { pet_id: id, owner_id },
      });
      if (!found_pet) {
        return res
          .status(404)
          .json({ msg: "Mascota no encontrada o no te pertenece", error: true });
      }

      // 2) Extraer campos permitidos para editar por dueño
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

      const updates = {};

      // — name (si viene) —
      if (name !== undefined) {
        if (!name.trim()) {
          return res
            .status(400)
            .json({ msg: "El nombre no puede quedar vacío", error: true });
        }
        if (name.length > 25) {
          return res
            .status(400)
            .json({ msg: "El nombre no puede exceder 25 caracteres", error: true });
        }
        updates.name = name;
      }

      // — age (si viene) —
      if (age !== undefined) {
        const numeric_age = Number(age);
        if (isNaN(numeric_age) || numeric_age <= 0 || numeric_age > 20) {
          return res.status(400).json({
            msg: "La edad debe ser un número positivo y no mayor a 20 años",
            error: true,
          });
        }
        updates.age = numeric_age;
      }

      // — zone (si viene) —
      if (zone !== undefined) {
        const zone_trim = zone.trim().toLowerCase();
        if (!ALLOWED_ZONES.map(z => z.toLowerCase()).includes(zone_trim)) {
          return res.status(400).json({
            msg: "Sector inválido. Opciones: Norte, Centro, Sur",
            error: true,
          });
        }
        updates.zone = zone_trim[0].toUpperCase() + zone_trim.slice(1);
      }

      // — photo (si viene) —
      if (photo !== undefined) {
        if (!photo.trim()) {
          return res
            .status(400)
            .json({ msg: "La fotografía no puede quedar vacía", error: true });
        }
        updates.photo = photo;
      }

      // — breed (si viene) —
      if (breed !== undefined) {
        if (breed && breed.length > 25) {
          return res.status(400).json({
            msg: "La raza no puede exceder los 25 caracteres",
            error: true,
          });
        }
        updates.breed = breed;
      }

      // — comments (si viene) —
      if (comments !== undefined) {
        if (comments && comments.length > 250) {
          return res.status(400).json({
            msg: "Los comentarios no pueden exceder los 250 caracteres",
            error: true,
          });
        }
        updates.comments = comments;
      }

      // — description & medical_condition (si vienen) —
      if (description !== undefined) {
        updates.description = description;
      }
      if (medical_condition !== undefined) {
        updates.medical_condition = medical_condition;
      }

      // 3) Si no hay nada que actualizar
      if (Object.keys(updates).length === 0) {
        return res
          .status(400)
          .json({ msg: "No hay campos para actualizar", error: true });
      }

      // 4) Aplicar cambios
      await found_pet.update(updates);
      return res.json({
        msg: "Mascota actualizada exitosamente",
        data: found_pet,
        error: false,
      });
    }

    // --- Cualquier otro rol no está autorizado ---
    return res.status(403).json({ msg: "No autorizado", error: true });
  } catch (error) {
    console.error("Error en update_pet:", error);
    return res.status(500).json({ msg: "Error en el servidor", error: true });
  }
};

module.exports = {
  create_pet,
  get_pets,
  get_pet_by_id,
  update_pet,
};