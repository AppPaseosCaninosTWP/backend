"use strict";

module.exports = (sequelize, DataTypes) => {
  const days_walk = sequelize.define(
    "days_walk",
    {
      walk_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: { model: "walk", key: "walk_id" },
      },
      start_date: DataTypes.DATEONLY,
      start_time: DataTypes.TIME,
      duration: DataTypes.INTEGER,
    },
    {
      tableName: "days_walk",
      timestamps: false,
    }
  );

  days_walk.associate = (models) => {
    days_walk.belongsTo(models.walk, { foreignKey: "walk_id" });
  };

  return days_walk;
};
