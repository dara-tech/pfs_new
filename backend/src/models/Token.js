import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Token = sequelize.define('Token', {
  code: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    field: 'code'
  },
  username: {
    type: DataTypes.STRING,
    field: 'username'
  },
  site_en: {
    type: DataTypes.STRING,
    field: 'site_en'
  },
  site_kh: {
    type: DataTypes.STRING,
    field: 'site_kh'
  }
}, {
  tableName: 'tokens',
  timestamps: false,
  underscored: false
});

