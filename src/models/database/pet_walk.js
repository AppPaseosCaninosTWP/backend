"use strict";

module.exports = (sequelize, DataTypes) => {
  const pet_walk = sequelize.define(
    "pet_walk",
    {
      walk_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      pet_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
    },
    {
      tableName: "pet_walk",
      timestamps: false,
    }
  );

  pet_walk.associate = (models) => {
    pet_walk.belongsTo(models.walk, { foreignKey: "walk_id" });
    pet_walk.belongsTo(models.pet, { foreignKey: "pet_id" });
  };

  return pet_walk;
};
