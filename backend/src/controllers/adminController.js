import bcrypt from 'bcrypt';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Question } from '../models/Question.js';
import { Settings } from '../models/Settings.js';
import { Device } from '../models/Device.js';
import { uploadImage, deleteImage, extractPublicId } from '../services/cloudinaryService.js';

// Users
export const getUsers = async (req, res) => {
  try {
    const [users] = await sequelize.query('SELECT id, name, email, created_at FROM users');
    
    // Get site access for each user
    const usersWithSites = await Promise.all(
      users.map(async (user) => {
        // Get user's role
        const [roleResults] = await sequelize.query(
          `SELECT r.id, r.name 
           FROM roles r
           INNER JOIN model_has_roles mhr ON r.id = mhr.role_id
           WHERE mhr.model_id = ? AND mhr.model_type = 'App\\\\User'
           LIMIT 1`,
          { replacements: [user.id] }
        );
        
        const role = roleResults.length > 0 ? roleResults[0] : null;
        const roleId = role ? role.id : null;
        
        // If admin (roleId === 1), they have access to all sites
        if (roleId === 1) {
          const [allSites] = await sequelize.query(
            'SELECT DISTINCT sitename as name FROM tbl_sites WHERE sitename IS NOT NULL ORDER BY sitename'
          );
          return {
            ...user,
            role: role ? role.name : null,
            sites: allSites.map(s => s.name),
            siteCount: allSites.length,
            hasAllSites: true
          };
        }
        
        // Get user's assigned sites
        // Group by site_id to ensure we only get unique site assignments
        const [siteResults] = await sequelize.query(
          `SELECT s.sitename as name 
           FROM tbl_sites s
           INNER JOIN user_belong2_sites ubs ON s.id = ubs.site_id
           WHERE ubs.model_id = ? AND ubs.model_type = 'App\\\\User'
           AND s.sitename IS NOT NULL
           GROUP BY ubs.site_id, s.sitename
           ORDER BY s.sitename`,
          { replacements: [user.id] }
        );
        
        const sites = siteResults.map(s => s.name);
        const hasAllSites = sites.includes('*');
        
        // If user has "*" permission, get all sites
        let finalSites = sites;
        if (hasAllSites) {
          const [allSites] = await sequelize.query(
            'SELECT DISTINCT sitename as name FROM tbl_sites WHERE sitename IS NOT NULL ORDER BY sitename'
          );
          finalSites = allSites.map(s => s.name);
        }
        
        return {
          ...user,
          role: role ? role.name : null,
          sites: finalSites,
          siteCount: finalSites.length,
          hasAllSites: hasAllSites || roleId === 1
        };
      })
    );
    
    res.json({ users: usersWithSites });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, siteIds } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const [existingUsers] = await sequelize.query(
      'SELECT id FROM users WHERE email = ?',
      { replacements: [email] }
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await sequelize.query(
      'INSERT INTO users (name, email, password, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      { replacements: [name, email, hashedPassword] }
    );

    const userId = result.insertId;

    // Assign sites if provided
    if (siteIds && Array.isArray(siteIds) && siteIds.length > 0) {
      // Remove duplicates from siteIds
      const uniqueSiteIds = [...new Set(siteIds.map(id => parseInt(id)).filter(id => !isNaN(id)))];
      
      for (const siteId of uniqueSiteIds) {
        await sequelize.query(
          'INSERT INTO user_belong2_sites (model_id, model_type, site_id) VALUES (?, ?, ?)',
          { replacements: [userId, 'App\\\\User', siteId] }
        );
      }
    }

    const [users] = await sequelize.query(
      'SELECT id, name, email, created_at FROM users WHERE id = ?',
      { replacements: [userId] }
    );

    res.json({ 
      message: 'User created successfully',
      user: users[0]
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, siteIds } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Check if user exists
    const [existingUsers] = await sequelize.query(
      'SELECT id FROM users WHERE id = ?',
      { replacements: [id] }
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is already taken by another user
    const [emailCheck] = await sequelize.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      { replacements: [email, id] }
    );

    if (emailCheck.length > 0) {
      return res.status(409).json({ error: 'Email already in use by another user' });
    }

    // Update user
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await sequelize.query(
        'UPDATE users SET name = ?, email = ?, password = ?, updated_at = NOW() WHERE id = ?',
        { replacements: [name, email, hashedPassword, id] }
      );
    } else {
      await sequelize.query(
        'UPDATE users SET name = ?, email = ?, updated_at = NOW() WHERE id = ?',
        { replacements: [name, email, id] }
      );
    }

    // Update site assignments if provided
    if (siteIds !== undefined) {
      // Use a transaction to ensure atomicity
      const transaction = await sequelize.transaction();
      try {
        // Remove all existing site assignments
        await sequelize.query(
          'DELETE FROM user_belong2_sites WHERE model_id = ? AND model_type = ?',
          { replacements: [id, 'App\\\\User'], transaction }
        );

        // Remove duplicates and add new site assignments
        if (Array.isArray(siteIds) && siteIds.length > 0) {
          // Remove duplicates from siteIds
          const uniqueSiteIds = [...new Set(siteIds.map(id => parseInt(id)).filter(id => !isNaN(id)))];
          
          // Insert unique site assignments
          for (const siteId of uniqueSiteIds) {
            // Check if entry already exists (shouldn't happen after delete, but safety check)
            const [existing] = await sequelize.query(
              'SELECT id FROM user_belong2_sites WHERE model_id = ? AND model_type = ? AND site_id = ?',
              { replacements: [id, 'App\\\\User', siteId], transaction }
            );
            
            if (existing.length === 0) {
              await sequelize.query(
                'INSERT INTO user_belong2_sites (model_id, model_type, site_id) VALUES (?, ?, ?)',
                { replacements: [id, 'App\\\\User', siteId], transaction }
              );
            }
          }
        }
        
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }

    const [users] = await sequelize.query(
      'SELECT id, name, email, created_at FROM users WHERE id = ?',
      { replacements: [id] }
    );

    res.json({ 
      message: 'User updated successfully',
      user: users[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await sequelize.query('DELETE FROM users WHERE id = ?', { replacements: [id] });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const [users] = await sequelize.query(
      'SELECT id, email FROM users WHERE id = ?',
      { replacements: [id] }
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Default password (can be changed to a random password if needed)
    const defaultPassword = 'password';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Update password
    await sequelize.query(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      { replacements: [hashedPassword, id] }
    );

    res.json({ 
      message: 'Password reset successfully',
      defaultPassword: defaultPassword // Return default password so admin can inform user
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Roles
export const getRoles = async (req, res) => {
  try {
    const [roles] = await sequelize.query('SELECT * FROM roles');
    res.json({ roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createRole = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const [result] = await sequelize.query(
      'INSERT INTO roles (name, created_at, updated_at) VALUES (?, NOW(), NOW())',
      { replacements: [name] }
    );

    const [roles] = await sequelize.query(
      'SELECT * FROM roles WHERE id = ?',
      { replacements: [result.insertId] }
    );

    res.json({ 
      message: 'Role created successfully',
      role: roles[0]
    });
  } catch (error) {
    console.error('Create role error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Role name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const [result] = await sequelize.query(
      'UPDATE roles SET name = ?, updated_at = NOW() WHERE id = ?',
      { replacements: [name, id] }
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const [roles] = await sequelize.query(
      'SELECT * FROM roles WHERE id = ?',
      { replacements: [id] }
    );

    res.json({ 
      message: 'Role updated successfully',
      role: roles[0]
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    await sequelize.query('DELETE FROM roles WHERE id = ?', { replacements: [id] });
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Permissions
export const getPermissions = async (req, res) => {
  try {
    const [permissions] = await sequelize.query('SELECT * FROM permissions');
    res.json({ permissions });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createPermission = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Permission name is required' });
    }

    const [result] = await sequelize.query(
      'INSERT INTO permissions (name, created_at, updated_at) VALUES (?, NOW(), NOW())',
      { replacements: [name] }
    );

    const [permissions] = await sequelize.query(
      'SELECT * FROM permissions WHERE id = ?',
      { replacements: [result.insertId] }
    );

    res.json({ 
      message: 'Permission created successfully',
      permission: permissions[0]
    });
  } catch (error) {
    console.error('Create permission error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Permission name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Permission name is required' });
    }

    const [result] = await sequelize.query(
      'UPDATE permissions SET name = ? WHERE id = ?',
      { replacements: [name, id] }
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    const [permissions] = await sequelize.query(
      'SELECT * FROM permissions WHERE id = ?',
      { replacements: [id] }
    );

    res.json({ 
      message: 'Permission updated successfully',
      permission: permissions[0]
    });
  } catch (error) {
    console.error('Update permission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deletePermission = async (req, res) => {
  try {
    const { id } = req.params;
    await sequelize.query('DELETE FROM permissions WHERE id = ?', { replacements: [id] });
    res.json({ message: 'Permission deleted successfully' });
  } catch (error) {
    console.error('Delete permission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Sites
export const getSites = async (req, res) => {
  try {
    const [sites] = await sequelize.query(
      'SELECT id, sitename as name, sitecode as code, province FROM tbl_sites ORDER BY province, sitename'
    );
    res.json({ sites });
  } catch (error) {
    console.error('Get sites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createSite = async (req, res) => {
  try {
    const { name, code, province } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Site name is required' });
    }

    const [result] = await sequelize.query(
      'INSERT INTO tbl_sites (sitename, sitecode, province) VALUES (?, ?, ?)',
      { replacements: [name, code || null, province || null] }
    );

    const [sites] = await sequelize.query(
      'SELECT id, sitename as name, sitecode as code, province FROM tbl_sites WHERE id = ?',
      { replacements: [result.insertId] }
    );

    res.json({ 
      message: 'Site created successfully',
      site: sites[0]
    });
  } catch (error) {
    console.error('Create site error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Site with this name or code already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSite = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, province } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Site name is required' });
    }

    const [result] = await sequelize.query(
      'UPDATE tbl_sites SET sitename = ?, sitecode = ?, province = ? WHERE id = ?',
      { replacements: [name, code || null, province || null, id] }
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const [sites] = await sequelize.query(
      'SELECT id, sitename as name, sitecode as code, province FROM tbl_sites WHERE id = ?',
      { replacements: [id] }
    );

    res.json({ 
      message: 'Site updated successfully',
      site: sites[0]
    });
  } catch (error) {
    console.error('Update site error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSite = async (req, res) => {
  try {
    const { id } = req.params;
    await sequelize.query('DELETE FROM tbl_sites WHERE id = ?', { replacements: [id] });
    res.json({ message: 'Site deleted successfully' });
  } catch (error) {
    console.error('Delete site error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Questions routes
export const getQuestions = async (req, res) => {
  try {
    // Check if table exists, if not return empty array
    const [results] = await sequelize.query(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'questions'"
    );
    const tableExists = results && results.length > 0 && Number(results[0].count) !== 0;
    if (!tableExists) {
      return res.json({ questions: [] });
    }

    let questions;
    try {
      questions = await Question.findAll({
        order: [['questionnaire_type', 'ASC'], ['order', 'ASC']]
      });
    } catch (findError) {
      // If options column doesn't exist on VPS yet, fetch without it
      const msg = findError.message || '';
      if (findError.name === 'SequelizeDatabaseError' && (msg.includes("Unknown column 'options'") || msg.includes('options'))) {
        const rows = await sequelize.query(
          "SELECT id, question_key, questionnaire_type, section, question_type, text_en, text_kh, audio_url_en, audio_url_kh, `order`, is_active, created_at, updated_at FROM questions ORDER BY questionnaire_type ASC, `order` ASC",
          { type: QueryTypes.SELECT }
        );
        const list = (rows || []).map((row) => ({ ...row, options: null }));
        return res.json({ questions: list });
      }
      throw findError;
    }

    // Ensure options is always present (can be missing if column not migrated yet)
    const list = questions.map((q) => {
      const row = q.get ? q.get({ plain: true }) : q;
      return { ...row, options: row.options ?? null };
    });
    res.json({ questions: list });
  } catch (error) {
    console.error('Get questions error:', error);
    // If table doesn't exist, return empty array instead of error
    if (error.name === 'SequelizeDatabaseError' && error.message.includes("doesn't exist")) {
      return res.json({ questions: [] });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createQuestion = async (req, res) => {
  try {
    const {
      questionKey,
      questionnaireType,
      section,
      questionType,
      textEn,
      textKh,
      order,
      isActive,
      audioUrlEn,
      audioUrlKh,
      options
    } = req.body;

    const question = await Question.create({
      question_key: questionKey,
      questionnaire_type: questionnaireType,
      section,
      question_type: questionType,
      text_en: textEn,
      text_kh: textKh,
      audio_url_en: audioUrlEn || null,
      audio_url_kh: audioUrlKh || null,
      order: order || 0,
      is_active: isActive !== undefined ? isActive : true,
      options: Array.isArray(options) ? options : null
    });

    res.json({ question, message: 'Question created successfully' });
  } catch (error) {
    console.error('Create question error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ error: 'Question key already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      questionKey,
      questionnaireType,
      section,
      questionType,
      textEn,
      textKh,
      order,
      isActive,
      audioUrlEn,
      audioUrlKh,
      options
    } = req.body;

    const question = await Question.findByPk(id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const updatePayload = {
      question_key: questionKey,
      questionnaire_type: questionnaireType,
      section,
      question_type: questionType,
      text_en: textEn,
      text_kh: textKh,
      audio_url_en: audioUrlEn !== undefined ? audioUrlEn : question.audio_url_en,
      audio_url_kh: audioUrlKh !== undefined ? audioUrlKh : question.audio_url_kh,
      order: order !== undefined ? order : question.order,
      is_active: isActive !== undefined ? isActive : question.is_active
    };
    if (options !== undefined) {
      updatePayload.options = Array.isArray(options) ? options : null;
    }

    try {
      await question.update(updatePayload);
    } catch (updateError) {
      const msg = updateError.message || '';
      const missingOptionsCol =
        updateError.name === 'SequelizeDatabaseError' &&
        (msg.includes("Unknown column 'options'") || msg.includes('options'));
      if (missingOptionsCol && 'options' in updatePayload) {
        const { options: _omit, ...withoutOptions } = updatePayload;
        await question.update(withoutOptions);
      } else {
        throw updateError;
      }
    }

    await question.reload();
    res.json({ question, message: 'Question updated successfully' });
  } catch (error) {
    console.error('Update question error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ error: 'Question key already exists' });
    } else if (error.name === 'SequelizeValidationError') {
      res.status(400).json({ error: error.errors?.[0]?.message || 'Validation failed' });
    } else {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findByPk(id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Delete audio files from Cloudinary if they exist
    const { deleteAudio, extractPublicId } = await import('../services/cloudinaryService.js');
    if (question.audio_url_en) {
      const publicId = extractPublicId(question.audio_url_en);
      if (publicId) {
        try {
          await deleteAudio(publicId);
        } catch (error) {
          console.error('Error deleting English audio:', error);
        }
      }
    }
    if (question.audio_url_kh) {
      const publicId = extractPublicId(question.audio_url_kh);
      if (publicId) {
        try {
          await deleteAudio(publicId);
        } catch (error) {
          console.error('Error deleting Khmer audio:', error);
        }
      }
    }

    await question.destroy();
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Upload audio file to Cloudinary
export const uploadQuestionAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const { questionKey, language } = req.body; // language: 'en' or 'kh'
    
    if (!questionKey || !language) {
      return res.status(400).json({ error: 'Question key and language are required' });
    }

    if (language !== 'en' && language !== 'kh') {
      return res.status(400).json({ error: 'Language must be "en" or "kh"' });
    }

    const { uploadAudio } = await import('../services/cloudinaryService.js');
    const result = await uploadAudio(
      req.file.buffer,
      req.file.originalname,
      'question-audio',
      language,
      questionKey
    );

    res.json({
      url: result.url,
      public_id: result.public_id,
      message: 'Audio uploaded successfully'
    });
  } catch (error) {
    console.error('Upload audio error:', error);
    res.status(500).json({ error: 'Failed to upload audio: ' + error.message });
  }
};

// Settings - Get logo URL
export const getLogo = async (req, res) => {
  try {
    const setting = await Settings.findByPk('app_logo_url');
    const logoUrl = setting ? setting.value : null;
    res.json({ logoUrl });
  } catch (error) {
    console.error('Get logo error:', error);
    res.status(500).json({ error: 'Failed to get logo' });
  }
};

// Settings - Update logo URL
export const updateLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    // Get current logo URL to delete old one
    const currentSetting = await Settings.findByPk('app_logo_url');
    let oldPublicId = null;
    if (currentSetting && currentSetting.value) {
      oldPublicId = extractPublicId(currentSetting.value);
    }

    // Upload new logo to Cloudinary
    const uploadResult = await uploadImage(
      req.file.buffer,
      req.file.originalname,
      'app-assets',
      'app_logo'
    );

    // Save logo URL to settings
    const [setting, created] = await Settings.findOrCreate({
      where: { key: 'app_logo_url' },
      defaults: {
        key: 'app_logo_url',
        value: uploadResult.url,
        description: 'Application logo URL'
      }
    });

    if (!created) {
      setting.value = uploadResult.url;
      await setting.save();
    }

    // Delete old logo from Cloudinary if it exists
    if (oldPublicId && oldPublicId !== uploadResult.public_id) {
      try {
        await deleteImage(oldPublicId);
      } catch (deleteError) {
        console.error('Failed to delete old logo:', deleteError);
        // Don't fail the request if deletion fails
      }
    }

    res.json({
      success: true,
      logoUrl: uploadResult.url,
      message: 'Logo updated successfully'
    });
  } catch (error) {
    console.error('Update logo error:', error);
    res.status(500).json({ error: 'Failed to update logo: ' + error.message });
  }
};

// Settings - Reset logo to default
export const resetLogo = async (req, res) => {
  try {
    const setting = await Settings.findByPk('app_logo_url');
    
    if (setting && setting.value) {
      // Delete current logo from Cloudinary
      const publicId = extractPublicId(setting.value);
      if (publicId) {
        try {
          await deleteImage(publicId);
        } catch (deleteError) {
          console.error('Failed to delete logo:', deleteError);
        }
      }
      
      // Delete setting
      await setting.destroy();
    }

    res.json({
      success: true,
      message: 'Logo reset to default'
    });
  } catch (error) {
    console.error('Reset logo error:', error);
    res.status(500).json({ error: 'Failed to reset logo' });
  }
};

// Settings - Get app icon URL
export const getAppIcon = async (req, res) => {
  try {
    const setting = await Settings.findByPk('app_icon_url');
    const iconUrl = setting ? setting.value : null;
    res.json({ iconUrl });
  } catch (error) {
    console.error('Get app icon error:', error);
    res.status(500).json({ error: 'Failed to get app icon' });
  }
};

// Settings - Update app icon URL
export const updateAppIcon = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    // Get current icon URL to delete old one
    const currentSetting = await Settings.findByPk('app_icon_url');
    let oldPublicId = null;
    if (currentSetting && currentSetting.value) {
      oldPublicId = extractPublicId(currentSetting.value);
    }

    // Upload new icon to Cloudinary
    const uploadResult = await uploadImage(
      req.file.buffer,
      req.file.originalname,
      'app-assets',
      'app_icon'
    );

    // Save icon URL to settings
    const [setting, created] = await Settings.findOrCreate({
      where: { key: 'app_icon_url' },
      defaults: {
        key: 'app_icon_url',
        value: uploadResult.url,
        description: 'Application icon URL (for mobile app)'
      }
    });

    if (!created) {
      setting.value = uploadResult.url;
      await setting.save();
    }

    // Delete old icon from Cloudinary if it exists
    if (oldPublicId && oldPublicId !== uploadResult.public_id) {
      try {
        await deleteImage(oldPublicId);
      } catch (deleteError) {
        console.error('Failed to delete old icon:', deleteError);
      }
    }

    res.json({
      success: true,
      iconUrl: uploadResult.url,
      message: 'App icon updated successfully. Note: Mobile app needs to be rebuilt for icon to change.'
    });
  } catch (error) {
    console.error('Update app icon error:', error);
    res.status(500).json({ error: 'Failed to update app icon: ' + error.message });
  }
};

// Settings - Reset app icon to default
export const resetAppIcon = async (req, res) => {
  try {
    const setting = await Settings.findByPk('app_icon_url');
    
    if (setting && setting.value) {
      // Delete current icon from Cloudinary
      const publicId = extractPublicId(setting.value);
      if (publicId) {
        try {
          await deleteImage(publicId);
        } catch (deleteError) {
          console.error('Failed to delete icon:', deleteError);
        }
      }
      
      // Delete setting
      await setting.destroy();
    }

    res.json({
      success: true,
      message: 'App icon reset to default'
    });
  } catch (error) {
    console.error('Reset app icon error:', error);
    res.status(500).json({ error: 'Failed to reset app icon' });
  }
};

// Devices - Get all devices
export const getDevices = async (req, res) => {
  try {
    const [devices] = await sequelize.query(`
      SELECT d.*, s.sitename as site_name
      FROM devices d
      LEFT JOIN tbl_sites s ON d.site_id = s.id
      ORDER BY d.created_at DESC
    `);
    res.json(devices);
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Failed to get devices' });
  }
};

// Devices - Create device
export const createDevice = async (req, res) => {
  try {
    const { name, device_id, device_type, platform, site_id, status, notes } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Device name is required' });
    }

    // Check if device_id already exists
    if (device_id) {
      const [existing] = await sequelize.query(
        'SELECT id FROM devices WHERE device_id = ?',
        { replacements: [device_id] }
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Device ID already exists' });
      }
    }

    const [result] = await sequelize.query(
      `INSERT INTO devices (name, device_id, device_type, platform, site_id, status, notes, created_at, updated_at)
       VALUES (:name, :device_id, :device_type, :platform, :site_id, :status, :notes, NOW(), NOW())`,
      {
        replacements: {
          name,
          device_id: device_id || null,
          device_type: device_type || 'tablet',
          platform: platform || 'android',
          site_id: site_id || null,
          status: status || 'active',
          notes: notes || null
        }
      }
    );

    const [newDevice] = await sequelize.query(
      `SELECT d.*, s.sitename as site_name
       FROM devices d
       LEFT JOIN tbl_sites s ON d.site_id = s.id
       WHERE d.id = ?`,
      { replacements: [result.insertId] }
    );

    res.status(201).json(newDevice[0]);
  } catch (error) {
    console.error('Create device error:', error);
    res.status(500).json({ error: 'Failed to create device: ' + error.message });
  }
};

// Devices - Update device
export const updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, device_id, device_type, platform, site_id, status, notes } = req.body;

    // Check if device exists
    const [existing] = await sequelize.query(
      'SELECT id FROM devices WHERE id = ?',
      { replacements: [id] }
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Check if device_id already exists (excluding current device)
    if (device_id) {
      const [duplicate] = await sequelize.query(
        'SELECT id FROM devices WHERE device_id = ? AND id != ?',
        { replacements: [device_id, id] }
      );
      if (duplicate.length > 0) {
        return res.status(400).json({ error: 'Device ID already exists' });
      }
    }

    await sequelize.query(
      `UPDATE devices 
       SET name = :name, device_id = :device_id, device_type = :device_type, 
           platform = :platform, site_id = :site_id, status = :status, 
           notes = :notes, updated_at = NOW()
       WHERE id = :id`,
      {
        replacements: {
          id,
          name,
          device_id: device_id || null,
          device_type: device_type || 'tablet',
          platform: platform || 'android',
          site_id: site_id || null,
          status: status || 'active',
          notes: notes || null
        }
      }
    );

    const [updatedDevice] = await sequelize.query(
      `SELECT d.*, s.sitename as site_name
       FROM devices d
       LEFT JOIN tbl_sites s ON d.site_id = s.id
       WHERE d.id = ?`,
      { replacements: [id] }
    );

    res.json(updatedDevice[0]);
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ error: 'Failed to update device: ' + error.message });
  }
};

// Devices - Delete device
export const deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if device exists
    const [existing] = await sequelize.query(
      'SELECT id FROM devices WHERE id = ?',
      { replacements: [id] }
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await sequelize.query(
      'DELETE FROM devices WHERE id = ?',
      { replacements: [id] }
    );

    res.json({ success: true, message: 'Device deleted successfully' });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ error: 'Failed to delete device: ' + error.message });
  }
};

// APK Management - Upload APK
export const uploadApk = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No APK file uploaded' });
    }

    // Validate file extension
    if (!req.file.originalname.toLowerCase().endsWith('.apk')) {
      return res.status(400).json({ error: 'Invalid file type. Only APK files are allowed.' });
    }

    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const downloadsDir = path.join(__dirname, '../../public/downloads');
    
    // Ensure directory exists
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `psf-mobile-${timestamp}.apk`;
    const filePath = path.join(downloadsDir, filename);

    // Save file
    fs.writeFileSync(filePath, req.file.buffer);

    // Get file info
    const stats = fs.statSync(filePath);

    res.json({
      success: true,
      message: 'APK uploaded successfully',
      filename,
      size: stats.size,
      sizeFormatted: formatFileSize(stats.size),
      url: `/api/downloads/apk`
    });
  } catch (error) {
    console.error('Upload APK error:', error);
    res.status(500).json({ error: 'Failed to upload APK: ' + error.message });
  }
};

// APK Management - Get APK info
export const getApkInfo = async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const downloadsDir = path.join(__dirname, '../../public/downloads');
    
    if (!fs.existsSync(downloadsDir)) {
      return res.json({ available: false, message: 'No APK file available' });
    }

    const files = fs.readdirSync(downloadsDir);
    const apkFiles = files.filter(file => file.toLowerCase().endsWith('.apk'));

    if (apkFiles.length === 0) {
      return res.json({ available: false, message: 'No APK file available' });
    }

    // Get all APK files with stats
    const apkFilesWithStats = apkFiles.map(file => {
      const filePath = path.join(downloadsDir, file);
      const stats = fs.statSync(filePath);
      return { 
        filename: file, 
        size: stats.size,
        sizeFormatted: formatFileSize(stats.size),
        modified: stats.mtime,
        url: `/api/downloads/apk`
      };
    });

    // Sort by modification time (newest first)
    apkFilesWithStats.sort((a, b) => b.modified - a.modified);

    res.json({
      available: true,
      files: apkFilesWithStats,
      latest: apkFilesWithStats[0]
    });
  } catch (error) {
    console.error('Get APK info error:', error);
    res.status(500).json({ error: 'Failed to get APK info: ' + error.message });
  }
};

// APK Management - Delete APK
export const deleteApk = async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename || !filename.toLowerCase().endsWith('.apk')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const filePath = path.join(__dirname, '../../public/downloads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'APK file not found' });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'APK deleted successfully'
    });
  } catch (error) {
    console.error('Delete APK error:', error);
    res.status(500).json({ error: 'Failed to delete APK: ' + error.message });
  }
};

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
