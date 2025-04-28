const { DataTypes } = require('sequelize');
const sequelize = require('./database/sequelize');

const Role = sequelize.define('role', {
  role_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
}, {
  tableName: 'role',
  timestamps: false
});

module.exports = Role;
