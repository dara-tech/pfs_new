import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ProviderData = sequelize.define('ProviderData', {
  _URI: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    field: '_URI'
  },
  ACKNOWLEDGE: {
    type: DataTypes.INTEGER,
    field: 'ACKNOWLEDGE'
  },
  acknowledge: {
    type: DataTypes.INTEGER,
    field: 'acknowledge'
  },
  dept: {
    type: DataTypes.STRING,
    field: 'dept'
  },
  other: {
    type: DataTypes.STRING,
    field: 'other'
  },
  e1: {
    type: DataTypes.STRING,
    field: 'e1'
  },
  e2: {
    type: DataTypes.STRING,
    field: 'e2'
  },
  e3: {
    type: DataTypes.STRING,
    field: 'e3'
  },
  e4: {
    type: DataTypes.STRING,
    field: 'e4'
  },
  e5: {
    type: DataTypes.STRING,
    field: 'e5'
  },
  e6: {
    type: DataTypes.STRING,
    field: 'e6'
  },
  START: {
    type: DataTypes.DATE,
    field: 'START'
  },
  SIMSERIAL: {
    type: DataTypes.STRING,
    field: 'SIMSERIAL'
  },
  USERNAME: {
    type: DataTypes.STRING,
    field: 'USERNAME'
  },
  META_INSTANCE_ID: {
    type: DataTypes.STRING,
    field: 'META_INSTANCE_ID'
  },
  DEVICEID: {
    type: DataTypes.STRING,
    field: 'DEVICEID'
  },
  _IS_COMPLETE: {
    type: DataTypes.INTEGER,
    field: '_IS_COMPLETE'
  },
  _SUBMISSION_DATE: {
    type: DataTypes.DATE,
    field: '_SUBMISSION_DATE'
  },
  _MODEL_VERSION: {
    type: DataTypes.STRING,
    field: '_MODEL_VERSION'
  }
}, {
  tableName: 'providerdata',
  timestamps: false,
  underscored: false
});

