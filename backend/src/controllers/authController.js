import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sequelize } from '../config/database.js';

export const login = async (req, res) => {
  try {
    const username = String(req.body.username ?? req.body.name ?? '').trim();
    const { password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Match legacy PSF login (Laravel used `name` field, not email)
    const [users] = await sequelize.query(
      'SELECT id, name, email, password FROM users WHERE name = ? LIMIT 1',
      { replacements: [username] }
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check if user has a password
    if (!user.password) {
      console.error(`[Login] User found but has no password hash for username: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }


    // Verify password - Handle both PHP ($2y$) and Node.js ($2b$, $2a$) bcrypt hashes
    try {
      let passwordHash = user.password;
      
      // Convert PHP's $2y$ prefix to $2a$ for bcrypt compatibility
      // $2y$ and $2a$ are algorithmically identical
      if (passwordHash.startsWith('$2y$')) {
        passwordHash = passwordHash.replace(/^\$2y\$/, '$2a$');
      }
      
      const isValidPassword = await bcrypt.compare(password.trim(), passwordHash.trim());

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Password comparison error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        username
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user permissions and roles
    const [permissionsResult] = await sequelize.query(
      `SELECT p.name 
       FROM permissions p
       INNER JOIN role_has_permissions rhp ON p.id = rhp.permission_id
       INNER JOIN model_has_roles mhr ON rhp.role_id = mhr.role_id
       WHERE mhr.model_id = ? AND mhr.model_type = 'App\\\\User'
       UNION
       SELECT p.name
       FROM permissions p
       INNER JOIN model_has_permissions mhp ON p.id = mhp.permission_id
       WHERE mhp.model_id = ? AND mhp.model_type = 'App\\\\User'`,
      { replacements: [user.id, user.id] }
    );

    const [rolesResult] = await sequelize.query(
      `SELECT r.id, r.name
       FROM roles r
       INNER JOIN model_has_roles mhr ON r.id = mhr.role_id
       WHERE mhr.model_id = ? AND mhr.model_type = 'App\\\\User'
       ORDER BY r.id ASC
       LIMIT 1`,
      { replacements: [user.id] }
    );

    const permissions = permissionsResult.map(p => p.name);
    const roles = rolesResult.map(r => r.name);
    const roleId = rolesResult.length > 0 ? rolesResult[0].id : null;

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, roleId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Store token in session
    req.session.token = token;

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      permissions,
      roles
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = async (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
};

export const getCurrentUser = async (req, res) => {
  try {
    const [users] = await sequelize.query(
      'SELECT id, name, email FROM users WHERE id = ? LIMIT 1',
      { replacements: [req.user.id] }
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user permissions and roles
    const [permissionsResult] = await sequelize.query(
      `SELECT p.name 
       FROM permissions p
       INNER JOIN role_has_permissions rhp ON p.id = rhp.permission_id
       INNER JOIN model_has_roles mhr ON rhp.role_id = mhr.role_id
       WHERE mhr.model_id = ? AND mhr.model_type = 'App\\\\User'
       UNION
       SELECT p.name
       FROM permissions p
       INNER JOIN model_has_permissions mhp ON p.id = mhp.permission_id
       WHERE mhp.model_id = ? AND mhp.model_type = 'App\\\\User'`,
      { replacements: [req.user.id, req.user.id] }
    );

    const [rolesResult] = await sequelize.query(
      `SELECT r.name
       FROM roles r
       INNER JOIN model_has_roles mhr ON r.id = mhr.role_id
       WHERE mhr.model_id = ? AND mhr.model_type = 'App\\\\User'`,
      { replacements: [req.user.id] }
    );

    const permissions = permissionsResult.map(p => p.name);
    const roles = rolesResult.map(r => r.name);

    res.json({ 
      user: users[0],
      permissions,
      roles
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    // Get user
    const [users] = await sequelize.query(
      'SELECT password FROM users WHERE id = ? LIMIT 1',
      { replacements: [userId] }
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password - handle both PHP ($2y$) and Node.js ($2b$, $2a$) hashes
    let passwordHash = users[0].password;
    if (passwordHash.startsWith('$2y$')) {
      passwordHash = passwordHash.replace(/^\$2y\$/, '$2a$');
    }
    const isValidPassword = await bcrypt.compare(currentPassword, passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await sequelize.query(
      'UPDATE users SET password = ? WHERE id = ?',
      { replacements: [hashedPassword, userId] }
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const forgotPassword = async (req, res) => {
  // TODO: Implement password reset email functionality
  res.json({ message: 'Password reset email sent' });
};

export const resetPassword = async (req, res) => {
  // TODO: Implement password reset functionality
  res.json({ message: 'Password reset successfully' });
};

