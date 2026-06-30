import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  question_key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  questionnaire_type: {
    type: DataTypes.ENUM('client', 'provider'),
    allowNull: false,
    defaultValue: 'client'
  },
  section: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  question_type: {
    type: DataTypes.ENUM('text', 'radio', 'checkbox', 'textarea'),
    allowNull: false,
    defaultValue: 'text'
  },
  text_en: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  text_kh: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  audio_url_en: {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: null
  },
  audio_url_kh: {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: null
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  options: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
    comment: 'Answer options for radio/checkbox: [{ value, text_en, text_kh, order }]'
  }
}, {
  tableName: 'questions',
  timestamps: true,
  underscored: true,
  // Don't sync automatically - table may already exist
  freezeTableName: true
});

