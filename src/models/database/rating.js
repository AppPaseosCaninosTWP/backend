"use strict";

module.exports = (sequelize, DataTypes) => {
  const Rating = sequelize.define(
    "rating",
    {
      rating_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      value: {
        type: DataTypes.DECIMAL(2, 1),
        allowNull: false,
        validate: { min: 0, max: 5 },
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: { len: [0, 250] },
      },
      sender_id: { type: DataTypes.INTEGER, allowNull: false },
      receiver_id: { type: DataTypes.INTEGER, allowNull: false },
      walk_id: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      tableName: "rating",
      underscored: true,
      timestamps: true,
    }
  );

  Rating.associate = (models) => {
    Rating.belongsTo(models.user, { as: "sender", foreignKey: "sender_id" });
    Rating.belongsTo(models.user, {
      as: "receiver",
      foreignKey: "receiver_id",
    });
    Rating.belongsTo(models.walk, { foreignKey: "walk_id" });
  };

  return Rating;
};
