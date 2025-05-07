"use strict";

module.exports = (sequelize, DataTypes) => {
  const role = sequelize.define(
    "role",
    {
      role_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
    },
    {
      tableName: "role",
      timestamps: false,
    }
  );

  role.associate = (models) => {
    role.hasMany(models.user, { foreignKey: "role_id", as: "users" });
  };

  return role;
};
