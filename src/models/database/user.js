"use strict";

module.exports = (sequelize, DataTypes) => {
  const user = sequelize.define(
    "user",
    {
      user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      is_enable: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      ticket: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      reset_code: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      reset_code_expires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "user",
      timestamps: false,
    }
  );

  user.associate = (models) => {
    user.belongsTo(models.role, { foreignKey: "role_id", as: "role" });
    user.hasMany(models.pet, { foreignKey: "owner_id", as: "pets" });
    user.hasOne(models.walker_profile, {
      foreignKey: "walker_id",
      as: "walker_profile",
    });
  };

  return user;
};
