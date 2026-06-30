import { sequelize } from '../src/config/database.js';
import { Device } from '../src/models/Device.js';

async function createDevicesTable() {
  try {
    console.log('Creating devices table...');
    
    // Sync the Device model to create the table
    await Device.sync({ alter: true });
    
    console.log('✅ Devices table created successfully');
    
    // Close the connection
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating devices table:', error);
    await sequelize.close();
    process.exit(1);
  }
}

createDevicesTable();
