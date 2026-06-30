/**
 * Ensure one administrator user exists (create or update password + role).
 *
 * Usage:
 *   cd backend && node seed-admin.js
 *   ADMIN_PASSWORD='YourPass123!' node seed-admin.js
 *
 * Env (optional):
 *   ADMIN_NAME      default Admin
 *   ADMIN_EMAIL     default admin@admin.com
 *   ADMIN_PASSWORD  default password
 *   ADMIN_ROLE_ID   default 1 (Administrator)
 */
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { sequelize } from './src/config/database.js';

dotenv.config();

const MODEL_TYPE = 'App\\User';
const adminName = process.env.ADMIN_NAME || 'Admin';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'password';
const adminRoleId = Number(process.env.ADMIN_ROLE_ID || 1);

async function ensureAdminRole() {
  const [roles] = await sequelize.query('SELECT id, name FROM roles WHERE id = ? LIMIT 1', {
    replacements: [adminRoleId],
  });
  if (roles.length > 0) return roles[0];

  await sequelize.query(
    `INSERT INTO roles (id, name, guard_name, created_at, updated_at)
     VALUES (?, 'Administrator', 'web', NOW(), NOW())`,
    { replacements: [adminRoleId] }
  );
  return { id: adminRoleId, name: 'Administrator' };
}

async function seedAdmin() {
  await sequelize.authenticate();
  const role = await ensureAdminRole();

  const [existing] = await sequelize.query(
    'SELECT id, name, email FROM users WHERE name = ? OR email = ? LIMIT 1',
    { replacements: [adminName, adminEmail] }
  );

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  let userId;

  if (existing.length === 0) {
    const [result] = await sequelize.query(
      `INSERT INTO users (name, email, password, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())`,
      { replacements: [adminName, adminEmail, hashedPassword] }
    );
    userId = result.insertId;
    console.log(`Created admin user id=${userId}`);
  } else {
    userId = existing[0].id;
    await sequelize.query(
      'UPDATE users SET name = ?, email = ?, password = ?, updated_at = NOW() WHERE id = ?',
      { replacements: [adminName, adminEmail, hashedPassword, userId] }
    );
    console.log(`Updated admin user id=${userId} (${existing[0].name})`);
  }

  const [roleLinks] = await sequelize.query(
    `SELECT role_id FROM model_has_roles
     WHERE model_id = ? AND model_type = ? AND role_id = ? LIMIT 1`,
    { replacements: [userId, MODEL_TYPE, adminRoleId] }
  );

  if (roleLinks.length === 0) {
    await sequelize.query(
      `INSERT INTO model_has_roles (role_id, model_id, model_type) VALUES (?, ?, ?)`,
      { replacements: [adminRoleId, userId, MODEL_TYPE] }
    );
    console.log(`Assigned role id=${adminRoleId} (${role.name})`);
  } else {
    console.log(`Role already assigned: ${role.name}`);
  }

  console.log('');
  console.log('Login at https://psfnew.nchads.gov.kh/login');
  console.log('  Username:', adminName);
  console.log('  Email:   ', adminEmail);
  console.log('  Password:', adminPassword);
  console.log('  Role:    ', role.name);
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('seed-admin failed:', err.message);
    process.exit(1);
  });
