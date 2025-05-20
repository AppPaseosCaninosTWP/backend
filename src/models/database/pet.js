"use strict";

module.exports = (sequelize, DataTypes) => {
  const pet = sequelize.define(
    "pet",
    {
      pet_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      breed: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      age: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      zone: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      medical_condition: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      photo: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      owner_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "pet",
      timestamps: false,
    }
  );

  pet.associate = (models) => {
    pet.belongsTo(models.user, { foreignKey: "owner_id", as: "owner" });

    // en lugar de hasMany(models.pet_walk), definimos la relación many-to-many:
    pet.belongsToMany(models.walk, {
      through:  models.pet_walk,
      foreignKey: "pet_id",
      otherKey:   "walk_id",
      as:        "walks"
    });
  };

  return pet;
};
