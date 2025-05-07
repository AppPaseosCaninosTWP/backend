"use strict";

module.exports = (sequelize, DataTypes) => {
  const DaysWalk = sequelize.define(
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

  DaysWalk.associate = (models) => {
    DaysWalk.belongsTo(models.walk, { foreignKey: "walk_id" });
  };

  return DaysWalk;
};
