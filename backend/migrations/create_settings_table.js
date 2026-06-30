import { sequelize } from '../src/config/database.js';
import { Settings } from '../src/models/Settings.js';

async function createSettingsTable() {
  try {
    console.log('Creating settings table...');
    
    // Sync the Settings model to create the table
    await Settings.sync({ alter: true });
    
    console.log('✅ Settings table created successfully');
    
    // Close the connection
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating settings table:', error);
    await sequelize.close();
    process.exit(1);
  }
}

createSettingsTable();
