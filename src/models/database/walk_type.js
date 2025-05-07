"use strict";

module.exports = (sequelize, DataTypes) => {
  const walkType = sequelize.define(
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

  walkType.associate = (models) => {
    walkType.hasMany(models.walk, { foreignKey: "walk_type_id" });
  };

  return walkType;
};
