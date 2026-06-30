/**
 * Security utilities for login protection
 */

/**
 * Get client IP address from request
 */
export const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'unknown';
};

/**
 * Check if account is locked
 */
export const isAccountLocked = async (sequelize, userId, maxAttempts = 5, lockoutDuration = 15) => {
  try {
    const [attempts] = await sequelize.query(
      `SELECT COUNT(*) as count, MAX(attempted_at) as last_attempt
       FROM login_attempts 
       WHERE user_id = ? AND success = 0 AND attempted_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      { replacements: [userId, lockoutDuration] }
    );

    const failedCount = attempts[0]?.count || 0;
    const isLocked = failedCount >= maxAttempts;

    if (isLocked) {
      const lastAttempt = attempts[0]?.last_attempt;
      const lockoutEnd = new Date(new Date(lastAttempt).getTime() + lockoutDuration * 60 * 1000);
      const minutesRemaining = Math.ceil((lockoutEnd - new Date()) / 60000);
      return { locked: true, minutesRemaining: Math.max(0, minutesRemaining) };
    }

    return { locked: false, attemptsRemaining: maxAttempts - failedCount };
  } catch (error) {
    console.error('Error checking account lock:', error);
    return { locked: false, attemptsRemaining: maxAttempts };
  }
};

/**
 * Record login attempt
 */
export const recordLoginAttempt = async (sequelize, userId, email, success, ipAddress, userAgent) => {
  try {
    await sequelize.query(
      `INSERT INTO login_attempts (user_id, email, success, ip_address, user_agent, attempted_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      { replacements: [userId, email, success ? 1 : 0, ipAddress, userAgent] }
    );
  } catch (error) {
    console.error('Error recording login attempt:', error);
  }
};

/**
 * Check rate limit by IP
 */
export const checkRateLimit = async (sequelize, ipAddress, maxAttempts = 10, windowMinutes = 15) => {
  try {
    const [attempts] = await sequelize.query(
      `SELECT COUNT(*) as count
       FROM login_attempts 
       WHERE ip_address = ? AND success = 0 AND attempted_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      { replacements: [ipAddress, windowMinutes] }
    );

    const attemptCount = attempts[0]?.count || 0;
    return {
      allowed: attemptCount < maxAttempts,
      attemptsRemaining: Math.max(0, maxAttempts - attemptCount),
      attemptsUsed: attemptCount
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return { allowed: true, attemptsRemaining: maxAttempts, attemptsUsed: 0 };
  }
};

/**
 * Create security tables if they don't exist
 */
export const initializeSecurityTables = async (sequelize) => {
  try {
    // Create login_attempts table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        email VARCHAR(255) NOT NULL,
        success TINYINT(1) NOT NULL DEFAULT 0,
        ip_address VARCHAR(45) NOT NULL,
        user_agent TEXT,
        attempted_at DATETIME NOT NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_email (email),
        INDEX idx_ip_address (ip_address),
        INDEX idx_attempted_at (attempted_at),
        INDEX idx_user_success_time (user_id, success, attempted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Create user_sessions table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(500) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        user_agent TEXT,
        device_info VARCHAR(255),
        last_activity DATETIME NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_token (token(255)),
        INDEX idx_expires_at (expires_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('Security tables initialized successfully');
  } catch (error) {
    console.error('Error initializing security tables:', error);
    // Don't throw - allow app to continue even if tables exist
  }
};

/**
 * Clean old login attempts (older than 30 days)
 */
export const cleanOldLoginAttempts = async (sequelize) => {
  try {
    await sequelize.query(
      `DELETE FROM login_attempts WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );
  } catch (error) {
    console.error('Error cleaning old login attempts:', error);
  }
};












