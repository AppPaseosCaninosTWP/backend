"use strict";

module.exports = (sequelize, DataTypes) => {
  const WalkType = sequelize.define(
    "walk_type",
    {
      walk_type_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: DataTypes.STRING,
    },
    {
      tableName: "walk_type",
      timestamps: false,
    }
  );

  WalkType.associate = (models) => {
    WalkType.hasMany(models.walk, { foreignKey: "walk_type_id" });
  };

  return WalkType;
};
