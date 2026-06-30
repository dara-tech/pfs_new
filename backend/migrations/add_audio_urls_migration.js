import { sequelize } from '../src/config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🔄 Running migration: Add audio_url_en and audio_url_kh to questions table...');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'add_audio_urls_to_questions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute SQL (MySQL doesn't support IF NOT EXISTS for ALTER TABLE, so we'll check first)
    const [checkResults] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = 'questions' 
      AND column_name = 'audio_url_en'
    `);
    
    if (checkResults[0].count === 0) {
      // Add columns
      await sequelize.query(`
        ALTER TABLE \`questions\` 
        ADD COLUMN \`audio_url_en\` VARCHAR(500) NULL DEFAULT NULL AFTER \`text_kh\`,
        ADD COLUMN \`audio_url_kh\` VARCHAR(500) NULL DEFAULT NULL AFTER \`audio_url_en\`
      `);
      console.log('✅ Added audio_url_en and audio_url_kh columns to questions table');
    } else {
      console.log('ℹ️  Columns already exist, skipping...');
    }
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
