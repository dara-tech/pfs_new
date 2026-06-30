import { sequelize } from '../src/config/database.js';

async function runMigration() {
  try {
    console.log('🔄 Running migration: Add options column to questions table...');

    const [checkResults] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
      AND table_name = 'questions'
      AND column_name = 'options'
    `);

    if (checkResults[0].count === 0) {
      await sequelize.query(`
        ALTER TABLE \`questions\`
        ADD COLUMN \`options\` JSON NULL DEFAULT NULL COMMENT 'Answer options for radio/checkbox: [{value, text_en, text_kh, order}]'
      `);
      console.log('✅ Added options column to questions table');
    } else {
      console.log('ℹ️  Column options already exists, skipping...');
    }

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
