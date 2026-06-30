import { sequelize } from '../src/config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Read SQL file
    const sqlFile = path.join(__dirname, 'create_questions_table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('Running migration: create_questions_table.sql');
    
    // Execute SQL
    await sequelize.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('✅ Questions table created (or already exists).');
    
    // Verify table exists
    const [results] = await sequelize.query(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'questions'"
    );
    
    if (results[0].count > 0) {
      console.log('✅ Verified: questions table exists.');
      
      // Check table structure
      const [columns] = await sequelize.query('DESCRIBE questions');
      console.log('\n📋 Table structure:');
      console.table(columns);
    } else {
      console.log('⚠️  Warning: questions table not found after migration.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Table already exists - this is OK!');
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
}

runMigration();

