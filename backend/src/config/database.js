import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const poolMax = Number(process.env.DB_POOL_MAX || 5);
const poolMin = Number(process.env.DB_POOL_MIN || 0);

export const sequelize = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 5,
      min: Number.isFinite(poolMin) && poolMin >= 0 ? poolMin : 0,
      acquire: Number(process.env.DB_POOL_ACQUIRE_MS || 30000),
      idle: Number(process.env.DB_POOL_IDLE_MS || 10000),
    },
  }
);
