// Simple script to create token via SQL
import { sequelize } from './backend/src/config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function createToken() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Create token using raw SQL
    await sequelize.query(`
      INSERT INTO tokens (code, username, site_en, site_kh) 
      VALUES ('ABC123', 'testuser', 'Test Site English', 'Test Site Khmer')
      ON DUPLICATE KEY UPDATE 
        username = VALUES(username),
        site_en = VALUES(site_en),
        site_kh = VALUES(site_kh)
    `);

    console.log('✅ Token ABC123 created/updated!');
    console.log('\n🌐 Access questionnaire at:');
    console.log('   http://localhost:5173/client/ABC123/kh');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createToken();
