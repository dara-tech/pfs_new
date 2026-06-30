import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const UserData = sequelize.define('UserData', {
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
  Q1A: {
    type: DataTypes.STRING,
    field: 'Q1A'
  },
  Q2A: {
    type: DataTypes.STRING,
    field: 'Q2A'
  },
  Q3A: {
    type: DataTypes.STRING,
    field: 'Q3A'
  },
  Q4A: {
    type: DataTypes.STRING,
    field: 'Q4A'
  },
  Q5A: {
    type: DataTypes.STRING,
    field: 'Q5A'
  },
  Q6A: {
    type: DataTypes.STRING,
    field: 'Q6A'
  },
  Q7A: {
    type: DataTypes.STRING,
    field: 'Q7A'
  },
  Q8A: {
    type: DataTypes.STRING,
    field: 'Q8A'
  },
  Q9A: {
    type: DataTypes.STRING,
    field: 'Q9A'
  },
  Q10A: {
    type: DataTypes.STRING,
    field: 'Q10A'
  },
  Q1B: {
    type: DataTypes.STRING,
    field: 'Q1B'
  },
  Q2B: {
    type: DataTypes.STRING,
    field: 'Q2B'
  },
  Q3B: {
    type: DataTypes.STRING,
    field: 'Q3B'
  },
  Q4B: {
    type: DataTypes.STRING,
    field: 'Q4B'
  },
  Q5B: {
    type: DataTypes.STRING,
    field: 'Q5B'
  },
  Q1C: {
    type: DataTypes.STRING,
    field: 'Q1C'
  },
  Q2C: {
    type: DataTypes.STRING,
    field: 'Q2C'
  },
  Q3C_1: {
    type: DataTypes.DECIMAL,
    field: 'Q3c_1'  // Database uses lowercase 'c'
  },
  Q3C_2: {
    type: DataTypes.DECIMAL,
    field: 'Q3c_2'  // Database uses lowercase 'c'
  },
  Q3C_3: {
    type: DataTypes.DECIMAL,
    field: 'Q3c_3'  // Database uses lowercase 'c'
  },
  Q3C_4: {
    type: DataTypes.DECIMAL,
    field: 'Q3c_4'  // Database uses lowercase 'c'
  },
  Q3C_5: {
    type: DataTypes.DECIMAL,
    field: 'Q3c_5'  // Database uses lowercase 'c'
  },
  Q3C_6: {
    type: DataTypes.DECIMAL,
    field: 'Q3c_6'  // Database uses lowercase 'c'
  },
  Q3C_7: {
    type: DataTypes.DECIMAL,
    field: 'Q3c_7'  // Database uses lowercase 'c'
  },
  Q3C_8: {
    type: DataTypes.DECIMAL,
    field: 'Q3c_8'  // Database uses lowercase 'c'
  },
  Q4C: {
    type: DataTypes.STRING,
    field: 'Q4C'
  },
  Q5C1: {
    type: DataTypes.STRING,
    field: 'Q5C1'
  },
  Q5C2: {
    type: DataTypes.STRING,
    field: 'Q5C2'
  },
  Q5C3: {
    type: DataTypes.STRING,
    field: 'Q5C3'
  },
  Q6C_1: {
    type: DataTypes.DECIMAL,
    field: 'Q6c_1'  // Database uses lowercase 'c', type is DECIMAL
  },
  Q6C_2: {
    type: DataTypes.DECIMAL,
    field: 'Q6c_2'  // Database uses lowercase 'c', type is DECIMAL
  },
  Q6C_3: {
    type: DataTypes.DECIMAL,
    field: 'Q6c_3'  // Database uses lowercase 'c', type is DECIMAL
  },
  Q6C_4: {
    type: DataTypes.DECIMAL,
    field: 'Q6c_4'  // Database uses lowercase 'c', type is DECIMAL
  },
  Q6C_5: {
    type: DataTypes.DECIMAL,
    field: 'Q6c_5'  // Database uses lowercase 'c', type is DECIMAL
  },
  Q6C_6: {
    type: DataTypes.DECIMAL,
    field: 'Q6c_6'  // Database uses lowercase 'c', type is DECIMAL
  },
  Q6C_7: {
    type: DataTypes.DECIMAL,
    field: 'Q6c_7'  // Database uses lowercase 'c', type is DECIMAL
  },
  Q6C_8: {
    type: DataTypes.DECIMAL,
    field: 'Q6c_8'  // Database uses lowercase 'c', type is DECIMAL
  },
  Q7C: {
    type: DataTypes.STRING,
    field: 'Q7C'
  },
  Q8C: {
    type: DataTypes.STRING,
    field: 'Q8C'
  },
  Q9C_1: {
    type: DataTypes.STRING,
    field: 'Q9C_1'
  },
  Q9C_2: {
    type: DataTypes.STRING,
    field: 'Q9C_2'
  },
  Q9C_3: {
    type: DataTypes.STRING,
    field: 'Q9C_3'
  },
  Q9C_4: {
    type: DataTypes.STRING,
    field: 'Q9C_4'
  },
  Q9C_5: {
    type: DataTypes.STRING,
    field: 'Q9C_5'
  },
  Q10C: {
    type: DataTypes.STRING,
    field: 'Q10C'
  },
  Q11C: {
    type: DataTypes.STRING,
    field: 'Q11C'
  },
  Q12C: {
    type: DataTypes.STRING,
    field: 'Q12C'
  },
  Q13C: {
    type: DataTypes.STRING,
    field: 'Q13C'
  },
  Q14C: {
    type: DataTypes.STRING,
    field: 'Q14C'
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
  }
}, {
  tableName: 'userdata',
  timestamps: false,
  underscored: false
});

