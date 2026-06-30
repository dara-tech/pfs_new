import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Settings = sequelize.define('Settings', {
  key: {
    type: DataTypes.STRING(100),
    primaryKey: true,
    allowNull: false,
    unique: true
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'settings',
  timestamps: true,
  underscored: true,
  freezeTableName: true
});
