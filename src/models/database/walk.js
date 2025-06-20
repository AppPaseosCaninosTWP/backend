"use strict";

module.exports = (sequelize, DataTypes) => {
  const walk = sequelize.define(
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
        allowNull: true,
      },
    },
    {
      tableName: "walk",
      timestamps: false,
    }
  );

  walk.associate = (models) => {
    walk.belongsTo(models.user,      { as: "client",    foreignKey: "client_id" });
    walk.belongsTo(models.user,      { as: "walker",    foreignKey: "walker_id" });
    walk.belongsTo(models.walk_type, { foreignKey: "walk_type_id", as: "walk_type" });

    // en lugar de hasMany(models.pet_walk), definimos la relación many-to-many:
    walk.belongsToMany(models.pet, {
      through: models.pet_walk,
      foreignKey: "walk_id",
      otherKey:   "pet_id",
      as:        "pets"
    });

    walk.hasMany(models.payment,    { foreignKey: "walk_id" });
    walk.hasMany(models.days_walk,  { foreignKey: "walk_id", as: "days" });
  };

  return walk;
};
