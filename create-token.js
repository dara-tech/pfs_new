// Quick script to create a test token
// Run: node create-token.js

import { sequelize } from './backend/src/config/database.js';
import { Token } from './backend/src/models/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function createToken() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Create or update token
    const [token, created] = await Token.findOrCreate({
      where: { code: 'ABC123' },
      defaults: {
        code: 'ABC123',
        username: 'testuser',
        site_en: 'Test Site English',
        site_kh: 'Test Site Khmer'
      }
    });

    if (created) {
      console.log('✅ Token created:', token.code);
    } else {
      // Update existing token
      token.username = 'testuser';
      token.site_en = 'Test Site English';
      token.site_kh = 'Test Site Khmer';
      await token.save();
      console.log('✅ Token updated:', token.code);
    }

    console.log('\n📋 Token Details:');
    console.log('   Code:', token.code);
    console.log('   Username:', token.username);
    console.log('   Site EN:', token.site_en);
    console.log('   Site KH:', token.site_kh);
    console.log('\n🌐 Access questionnaire at:');
    console.log('   http://localhost:5173/client/ABC123/kh');
    console.log('   http://localhost:5173/client/ABC123/en');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createToken();




