const { DataTypes } = require('sequelize');
const sequelize = require('./database/sequelize');

const User = sequelize.define('user', {
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
    references: {
      model: 'roles',
      key: 'role_id',
    },
    allowNull: false,
  }
}, {
  tableName: 'user',
  timestamps: false
});

User.belongsTo(Role, {
    foreignKey: 'role_id',
    as: 'role'
  });

module.exports = User;
