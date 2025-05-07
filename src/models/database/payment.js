"use strict";

module.exports = (sequelize, DataTypes) => {
    const Payment = sequelize.define('payment', {
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
  
    Payment.associate = models => {
      Payment.belongsTo(models.walk, { foreignKey: 'walk_id' });
    };
  
    return Payment;
  };
  