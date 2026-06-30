// Create token script using backend database config
import { sequelize } from './src/config/database.js';
import { QueryTypes } from 'sequelize';

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
    `, { type: QueryTypes.INSERT });

    console.log('✅ Token ABC123 created/updated!');
    
    // Verify
    const [results] = await sequelize.query(
      `SELECT * FROM tokens WHERE code = 'ABC123'`,
      { type: QueryTypes.SELECT }
    );
    
    console.log('\n📋 Token Details:');
    console.log(JSON.stringify(results, null, 2));
    console.log('\n🌐 Access questionnaire at:');
    console.log('   http://localhost:5173/client/ABC123/kh');
    console.log('   http://localhost:5173/client/ABC123/en');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createToken();




