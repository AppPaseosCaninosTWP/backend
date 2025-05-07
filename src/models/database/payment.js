"use strict";

module.exports = (sequelize, DataTypes) => {
    const payment = sequelize.define('payment', {
      payment_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      amount: DataTypes.DECIMAL,
      date: DataTypes.DATE,
      status: DataTypes.STRING,
      walk_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    }, {
      tableName: 'payment',
      timestamps: false
    });
  
    payment.associate = models => {
      payment.belongsTo(models.walk, { foreignKey: 'walk_id' });
    };
  
    return payment;
  };
  