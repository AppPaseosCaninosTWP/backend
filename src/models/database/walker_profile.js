"use strict";

module.exports = (sequelize, DataTypes) => {
  const walker_profile = sequelize.define(
    "walker_profile",
    {
      walker_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      experience: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      walker_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      zone: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      photo: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      balance: {
        type: DataTypes.DECIMAL,
        defaultValue: 0,
      },
      on_review: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "walker_profile",
      timestamps: false,
    }
  );

  walker_profile.associate = (models) => {
    walker_profile.belongsTo(models.user, {
      foreignKey: "walker_id",
      as: "user",
    });
  };

  return walker_profile;
};
