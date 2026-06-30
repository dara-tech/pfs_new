import { Question } from '../src/models/Question.js';
import { sequelize } from '../src/config/database.js';
import { en } from '../../frontend/src/lib/translations/en.js';
import { kh } from '../../frontend/src/lib/translations/kh.js';

// Map question keys to their sections and types
const questionMapping = {
  client: [
    // Consent
    { key: 'acknowledge', section: 'consent', type: 'radio', order: 0 },
    
    // Section 1A
    { key: 'q1a', section: 'section_1A', type: 'radio', order: 1 },
    { key: 'q2a', section: 'section_1A', type: 'radio', order: 2 },
    { key: 'q3a', section: 'section_1A', type: 'radio', order: 3 },
    { key: 'q4a', section: 'section_1A', type: 'radio', order: 4 },
    { key: 'q5a', section: 'section_1A', type: 'radio', order: 5 },
    
    // Section 1A1
    { key: 'q6a', section: 'section_1A1', type: 'radio', order: 6 },
    { key: 'q7a', section: 'section_1A1', type: 'radio', order: 7 },
    { key: 'q8a', section: 'section_1A1', type: 'radio', order: 8 },
    { key: 'q9a', section: 'section_1A1', type: 'radio', order: 9 },
    { key: 'q10a', section: 'section_1A1', type: 'radio', order: 10 },
    
    // Section 1B
    { key: 'q1b', section: 'section_1B', type: 'radio', order: 11 },
    { key: 'q2b', section: 'section_1B', type: 'radio', order: 12 },
    { key: 'q3b', section: 'section_1B', type: 'radio', order: 13 },
    { key: 'q4b', section: 'section_1B', type: 'radio', order: 14 },
    { key: 'q5b', section: 'section_1B', type: 'radio', order: 15 },
    
    // Section 1C
    { key: 'q1c', section: 'section_1C', type: 'radio', order: 16 },
    { key: 'q2c', section: 'section_1C', type: 'radio', order: 17 },
    { key: 'q3c', section: 'section_1C', type: 'checkbox', order: 18 },
    { key: 'q4c', section: 'section_1C', type: 'radio', order: 19 },
    
    // Section 5C
    { key: 'q5c1', section: 'section_5C', type: 'radio', order: 20 },
    { key: 'q5c2', section: 'section_5C', type: 'radio', order: 21 },
    { key: 'q5c3', section: 'section_5C', type: 'radio', order: 22 },
    
    // Section 6C
    { key: 'q6c', section: 'section_6C', type: 'checkbox', order: 23 },
    { key: 'q7c', section: 'section_6C', type: 'radio', order: 24 },
    { key: 'q8c', section: 'section_6C', type: 'radio', order: 25 },
    { key: 'q9c', section: 'section_6C', type: 'checkbox', order: 26 },
    { key: 'q10c', section: 'section_6C', type: 'radio', order: 27 },
    { key: 'q11c', section: 'section_6C', type: 'radio', order: 28 },
    { key: 'q12c', section: 'section_6C', type: 'radio', order: 29 },
    { key: 'q13c', section: 'section_6C', type: 'radio', order: 30 },
    { key: 'q14c', section: 'section_6C', type: 'text', order: 31 },
  ],
  provider: [
    // Consent
    { key: 'consent', section: 'consent', type: 'radio', order: 0 },
    
    // Section 1
    { key: 'dept', section: 'section1', type: 'radio', order: 1 },
    
    // Section 2
    { key: 'e1', section: 'section2', type: 'radio', order: 2 },
    { key: 'e2', section: 'section2', type: 'radio', order: 3 },
    { key: 'e3', section: 'section2', type: 'radio', order: 4 },
    { key: 'e4', section: 'section2', type: 'radio', order: 5 },
    { key: 'e5', section: 'section2', type: 'radio', order: 6 },
    { key: 'e6', section: 'section2', type: 'radio', order: 7 },
  ]
};

async function importQuestions() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established.\n');

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // Import client questions
    console.log('📝 Importing Client questions...');
    for (const mapping of questionMapping.client) {
      try {
        const textEn = en.client.questions[mapping.key] || '';
        const textKh = kh.client.questions[mapping.key] || '';

        if (!textEn && !textKh) {
          console.log(`⚠️  Skipping ${mapping.key} - no text found`);
          skipped++;
          continue;
        }

        const [question, created] = await Question.findOrCreate({
          where: { question_key: mapping.key },
          defaults: {
            question_key: mapping.key,
            questionnaire_type: 'client',
            section: mapping.section,
            question_type: mapping.type,
            text_en: textEn,
            text_kh: textKh,
            order: mapping.order,
            is_active: true
          }
        });

        if (created) {
          console.log(`✅ Created: ${mapping.key} (${mapping.section})`);
          imported++;
        } else {
          // Update existing question
          await question.update({
            text_en: textEn,
            text_kh: textKh,
            section: mapping.section,
            question_type: mapping.type,
            order: mapping.order
          });
          console.log(`🔄 Updated: ${mapping.key} (${mapping.section})`);
          skipped++;
        }
      } catch (error) {
        console.error(`❌ Error importing ${mapping.key}:`, error.message);
        errors++;
      }
    }

    // Import provider questions
    console.log('\n📝 Importing Provider questions...');
    for (const mapping of questionMapping.provider) {
      try {
        const textEn = en.provider.questions[mapping.key] || '';
        const textKh = kh.provider.questions[mapping.key] || '';

        if (!textEn && !textKh) {
          console.log(`⚠️  Skipping ${mapping.key} - no text found`);
          skipped++;
          continue;
        }

        const [question, created] = await Question.findOrCreate({
          where: { question_key: mapping.key },
          defaults: {
            question_key: mapping.key,
            questionnaire_type: 'provider',
            section: mapping.section,
            question_type: mapping.type,
            text_en: textEn,
            text_kh: textKh,
            order: mapping.order,
            is_active: true
          }
        });

        if (created) {
          console.log(`✅ Created: ${mapping.key} (${mapping.section})`);
          imported++;
        } else {
          // Update existing question
          await question.update({
            text_en: textEn,
            text_kh: textKh,
            section: mapping.section,
            question_type: mapping.type,
            order: mapping.order
          });
          console.log(`🔄 Updated: ${mapping.key} (${mapping.section})`);
          skipped++;
        }
      } catch (error) {
        console.error(`❌ Error importing ${mapping.key}:`, error.message);
        errors++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Import Summary:');
    console.log(`✅ Imported: ${imported} questions`);
    console.log(`🔄 Updated: ${skipped} questions`);
    console.log(`❌ Errors: ${errors} questions`);
    console.log('='.repeat(50));

    // Count total questions
    const totalClient = await Question.count({ where: { questionnaire_type: 'client' } });
    const totalProvider = await Question.count({ where: { questionnaire_type: 'provider' } });
    console.log(`\n📈 Total Questions in Database:`);
    console.log(`   Client: ${totalClient}`);
    console.log(`   Provider: ${totalProvider}`);
    console.log(`   Total: ${totalClient + totalProvider}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

importQuestions();

