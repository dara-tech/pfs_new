import bcrypt from 'bcrypt';
import { sequelize } from './src/config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const adminName = process.env.ADMIN_NAME || 'Admin';
const newPassword = process.env.ADMIN_PASSWORD || 'password';

async function resetPassword() {
  try {
    await sequelize.authenticate();

    const [users] = await sequelize.query(
      'SELECT id, name, email FROM users WHERE name = ? LIMIT 1',
      { replacements: [adminName] }
    );

    if (users.length === 0) {
      console.error(`No user found with name: ${adminName}`);
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await sequelize.query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', {
      replacements: [hashedPassword, users[0].id],
    });

    const isValid = await bcrypt.compare(newPassword, hashedPassword);
    console.log(`Password reset for "${users[0].name}" (${users[0].email})`);
    console.log(`Verification: ${isValid ? 'PASSED' : 'FAILED'}`);
    console.log('Login with username (name field):', adminName);

    process.exit(isValid ? 0 : 1);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetPassword();
