import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Device = sequelize.define('Device', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  device_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    comment: 'Unique device identifier (e.g., serial number, IMEI)'
  },
  device_type: {
    type: DataTypes.ENUM('tablet', 'phone', 'other'),
    allowNull: false,
    defaultValue: 'tablet'
  },
  platform: {
    type: DataTypes.ENUM('android', 'ios', 'other'),
    allowNull: false,
    defaultValue: 'android'
  },
  site_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Associated site/location'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'maintenance'),
    allowNull: false,
    defaultValue: 'active'
  },
  last_seen: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last time device was active'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'devices',
  timestamps: true,
  underscored: true,
  freezeTableName: true
});
