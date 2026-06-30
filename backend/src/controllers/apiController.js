import { sequelize } from '../config/database.js';

export const getTableList = async (req, res) => {
  try {
    const [tables] = await sequelize.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?",
      { replacements: [process.env.DB_DATABASE] }
    );
    res.json({ tables: tables.map(t => t.TABLE_NAME) });
  } catch (error) {
    console.error('Get table list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFieldList = async (req, res) => {
  try {
    const { table } = req.params;
    const [fields] = await sequelize.query(
      "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
      { replacements: [process.env.DB_DATABASE, table] }
    );
    res.json({ fields });
  } catch (error) {
    console.error('Get field list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getData = async (req, res) => {
  try {
    const { table } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    // Use parameterized query with proper escaping
    const [data] = await sequelize.query(
      `SELECT * FROM \`${table}\` LIMIT :limit OFFSET :offset`,
      { 
        replacements: { 
          limit: parseInt(limit), 
          offset: parseInt(offset) 
        } 
      }
    );
    
    res.json({ data });
  } catch (error) {
    console.error('Get data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

