"use strict";

module.exports = (sequelize, DataTypes) => {
  const Walk = sequelize.define(
    "walk",
    {
      walk_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      walk_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      comments: DataTypes.TEXT,
      status: DataTypes.STRING,
      client_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      walker_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      request_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "walk",
      timestamps: false,
    }
  );

  Walk.associate = (models) => {
    Walk.belongsTo(models.user, { as: "client", foreignKey: "client_id" });
    Walk.belongsTo(models.user, { as: "walker", foreignKey: "walker_id" });
    Walk.belongsTo(models.walk_type, { foreignKey: "walk_type_id" });
    Walk.belongsTo(models.request_announcement, { foreignKey: "request_id" });

    Walk.hasMany(models.pet_walk, { foreignKey: "walk_id" });
    Walk.hasMany(models.payment, { foreignKey: "walk_id" });
  };

  return Walk;
};
