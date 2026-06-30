import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Site = sequelize.define('Site', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id'
  },
  username: {
    type: DataTypes.STRING,
    field: 'username'
  },
  sitecode: {
    type: DataTypes.STRING,
    field: 'sitecode'
  },
  province: {
    type: DataTypes.STRING,
    field: 'province'
  },
  sitename: {
    type: DataTypes.STRING,
    field: 'sitename'
  },
  site: {
    type: DataTypes.STRING,
    field: 'site'
  },
  province_kh: {
    type: DataTypes.STRING,
    field: 'province_kh'
  }
}, {
  tableName: 'tbl_sites',
  timestamps: false,
  underscored: false
});

