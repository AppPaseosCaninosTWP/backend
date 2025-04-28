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

Role.hasMany(sequelize.models.user, {
    foreignKey: 'role_id',
    as: 'users'
  });

module.exports = Role;
