"use strict";

module.exports = (sequelize, DataTypes) => {
  const walk_type = sequelize.define(
    "walk_type",
    {
      walk_type_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: false,
      },
      name: DataTypes.STRING,
    },
    {
      tableName: "walk_type",
      timestamps: false,
    }
  );

  walk_type.associate = (models) => {
    walk_type.hasMany(models.walk, { foreignKey: "walk_type_id" });
  };

  return walk_type;
};
