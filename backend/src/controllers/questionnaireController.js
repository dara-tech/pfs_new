import crypto from 'crypto';
import { UserData, ProviderData, Token, Site } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';

// Verify token helper
const verifyToken = async (token) => {
  if (!token) return false;
  try {
    const dbToken = await Token.findByPk(token);
    return dbToken !== null;
  } catch (error) {
    return false;
  }
};

// Sync userdata to tbl_psf_patient_v4 for reporting
const syncToReportingTable = async (userData) => {
  try {
    // Check if survey is complete OR if user disagreed (ACKNOWLEDGE != 1)
    // Disagree records should also be synced for reporting purposes
    const isComplete = userData._IS_COMPLETE == 1 || userData._IS_COMPLETE === 1 || userData._IS_COMPLETE === '1';
    const isDisagree = userData.ACKNOWLEDGE != 1 && userData.ACKNOWLEDGE !== '1' && userData.ACKNOWLEDGE != null;
    
    if (!userData || (!isComplete && !isDisagree)) {
      return; // Only sync completed surveys or disagree records
    }

    // Get site information from username
    let siteInfo = null;
    try {
      siteInfo = await Site.findOne({
        where: { username: userData.USERNAME },
        attributes: ['site', 'sitename', 'province', 'province_kh', 'sitecode']
      });
      if (!siteInfo) {
        console.warn(`[Sync] Site not found for username: ${userData.USERNAME}`);
      }
    } catch (siteError) {
      console.error(`[Sync] Error fetching site info for ${userData.USERNAME}:`, siteError);
      // Continue with null siteInfo
    }

    // Format date for reporting (extract month name for period display)
    const startDate = userData.START ? new Date(userData.START) : new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const period = `${monthNames[startDate.getMonth()]}-${String(startDate.getFullYear()).slice(-2)}`;
    // Format month column in "F-y" format (e.g., "December-25") to match old system
    const month = `${monthNames[startDate.getMonth()]}-${String(startDate.getFullYear()).slice(-2)}`;

    // Check if record already exists
    const [existing] = await sequelize.query(
      'SELECT _URI FROM tbl_psf_patient_v4 WHERE _URI = :uri LIMIT 1',
      {
        replacements: { uri: userData._URI },
        type: QueryTypes.SELECT
      }
    );

    const replacements = {
      acknowledge: userData.ACKNOWLEDGE !== null && userData.ACKNOWLEDGE !== undefined ? userData.ACKNOWLEDGE : null,
      q1a: userData.Q1A || null, q2a: userData.Q2A || null, q3a: userData.Q3A || null,
      q4a: userData.Q4A || null, q5a: userData.Q5A || null, q6a: userData.Q6A || null,
      q7a: userData.Q7A || null, q8a: userData.Q8A || null, q9a: userData.Q9A || null,
      q10a: userData.Q10A || null,
      q1b: userData.Q1B || null, q2b: userData.Q2B || null, q3b: userData.Q3B || null,
      q4b: userData.Q4B || null, q5b: userData.Q5B || null,
      q1c: userData.Q1C || null, q2c: userData.Q2C || null,
      q3c1: userData.Q3C_1 || null, q3c2: userData.Q3C_2 || null, q3c3: userData.Q3C_3 || null,
      q3c4: userData.Q3C_4 || null, q3c5: userData.Q3C_5 || null, q3c6: userData.Q3C_6 || null,
      q3c7: userData.Q3C_7 || null, q3c8: userData.Q3C_8 || null,
      q4c: userData.Q4C || null,
      q5c1: userData.Q5C1 || null, q5c2: userData.Q5C2 || null, q5c3: userData.Q5C3 || null,
      q6c1: userData.Q6C_1 || null, q6c2: userData.Q6C_2 || null, q6c3: userData.Q6C_3 || null,
      q6c4: userData.Q6C_4 || null, q6c5: userData.Q6C_5 || null, q6c6: userData.Q6C_6 || null,
      q6c7: userData.Q6C_7 || null, q6c8: userData.Q6C_8 || null,
      q7c: userData.Q7C || null, q8c: userData.Q8C || null,
      q9c1: userData.Q9C_1 || null, q9c2: userData.Q9C_2 || null, q9c3: userData.Q9C_3 || null,
      q9c4: userData.Q9C_4 || null, q9c5: userData.Q9C_5 || null,
      q10c: userData.Q10C || null, q11c: userData.Q11C || null, q12c: userData.Q12C || null,
      q13c: userData.Q13C || null, q14c: userData.Q14C || null,
      start: userData.START || null,
      simserial: userData.SIMSERIAL || null,
      username: userData.USERNAME || null,
      meta_instance_id: userData.META_INSTANCE_ID || null,
      deviceid: userData.DEVICEID || null,
      uri: userData._URI || null,
      is_complete: userData._IS_COMPLETE || null,
      submission_date: userData._SUBMISSION_DATE || startDate,
      site: siteInfo?.site || null,
      sitename: siteInfo?.sitename || null,
      province: siteInfo?.province || null,
      province_kh: siteInfo?.province_kh || null,
      month: month
    };

    if (existing) {
      const updateQuery = `
        UPDATE tbl_psf_patient_v4 SET
          ACKNOWLEDGE = :acknowledge,
          Q1A = :q1a, Q2A = :q2a, Q3A = :q3a, Q4A = :q4a, Q5A = :q5a,
          Q6A = :q6a, Q7A = :q7a, Q8A = :q8a, Q9A = :q9a, Q10A = :q10a,
          Q1B = :q1b, Q2B = :q2b, Q3B = :q3b, Q4B = :q4b, Q5B = :q5b,
          Q1C = :q1c, Q2C = :q2c,
          Q3C_1 = :q3c1, Q3C_2 = :q3c2, Q3C_3 = :q3c3, Q3C_4 = :q3c4,
          Q3C_5 = :q3c5, Q3C_6 = :q3c6, Q3C_7 = :q3c7, Q3C_8 = :q3c8,
          Q4C = :q4c, Q5C1 = :q5c1, Q5C2 = :q5c2, Q5C3 = :q5c3,
          Q6C_1 = :q6c1, Q6C_2 = :q6c2, Q6C_3 = :q6c3, Q6C_4 = :q6c4,
          Q6C_5 = :q6c5, Q6C_6 = :q6c6, Q6C_7 = :q6c7, Q6C_8 = :q6c8,
          Q7C = :q7c, Q8C = :q8c,
          Q9C_1 = :q9c1, Q9C_2 = :q9c2, Q9C_3 = :q9c3, Q9C_4 = :q9c4, Q9C_5 = :q9c5,
          Q10C = :q10c, Q11C = :q11c, Q12C = :q12c, Q13C = :q13c, Q14C = :q14c,
          START = :start, _IS_COMPLETE = :is_complete, _SUBMISSION_DATE = :submission_date,
          site = :site, sitename = :sitename,
          province = :province, province_kh = :province_kh,
          month = :month
        WHERE _URI = :uri
      `;
      await sequelize.query(updateQuery, { replacements, type: QueryTypes.UPDATE });
    } else {
      // Insert new record
      const insertQuery = `
        INSERT INTO tbl_psf_patient_v4 (
          ACKNOWLEDGE, Q1A, Q2A, Q3A, Q4A, Q5A, Q6A, Q7A, Q8A, Q9A, Q10A,
          Q1B, Q2B, Q3B, Q4B, Q5B,
          Q1C, Q2C, Q3C_1, Q3C_2, Q3C_3, Q3C_4, Q3C_5, Q3C_6, Q3C_7, Q3C_8,
          Q4C, Q5C1, Q5C2, Q5C3,
          Q6C_1, Q6C_2, Q6C_3, Q6C_4, Q6C_5, Q6C_6, Q6C_7, Q6C_8,
          Q7C, Q8C, Q9C_1, Q9C_2, Q9C_3, Q9C_4, Q9C_5,
          Q10C, Q11C, Q12C, Q13C, Q14C,
          START, SIMSERIAL, USERNAME, META_INSTANCE_ID, DEVICEID, _URI, _IS_COMPLETE, _SUBMISSION_DATE,
          site, sitename, province, province_kh, month
        )
        VALUES (
          :acknowledge, :q1a, :q2a, :q3a, :q4a, :q5a, :q6a, :q7a, :q8a, :q9a, :q10a,
          :q1b, :q2b, :q3b, :q4b, :q5b,
          :q1c, :q2c, :q3c1, :q3c2, :q3c3, :q3c4, :q3c5, :q3c6, :q3c7, :q3c8,
          :q4c, :q5c1, :q5c2, :q5c3,
          :q6c1, :q6c2, :q6c3, :q6c4, :q6c5, :q6c6, :q6c7, :q6c8,
          :q7c, :q8c, :q9c1, :q9c2, :q9c3, :q9c4, :q9c5,
          :q10c, :q11c, :q12c, :q13c, :q14c,
          :start, :simserial, :username, :meta_instance_id, :deviceid, :uri, :is_complete, :submission_date,
          :site, :sitename, :province, :province_kh, :month
        )
      `;
      await sequelize.query(insertQuery, { replacements, type: QueryTypes.INSERT });
    }
  } catch (error) {
    console.error('[Sync] Error syncing to reporting table:', error.message, { uri: userData?._URI });
    // Don't throw - we don't want to fail the survey submission if sync fails
  }
};

// Get token info
export const getTokenInfo = async (req, res) => {
  try {
    const { token } = req.params;
    const tokenData = await Token.findByPk(token);
    if (!tokenData) {
      return res.status(404).json({ error: 'Token not found' });
    }
    res.json(tokenData);
  } catch (error) {
    console.error('Get token info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all tokens
export const getAllTokens = async (req, res) => {
  try {
    const tokens = await Token.findAll({
      attributes: ['code', 'username']
    });
    res.json({ tokens });
  } catch (error) {
    console.error('Get tokens error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all sites
export const getAllSites = async (req, res) => {
  try {
    const sites = await Site.findAll({
      attributes: ['username', 'site', 'sitename', 'province', 'province_kh'],
      order: [['province', 'ASC']],
      distinct: true
    });
    res.json({ sites });
  } catch (error) {
    console.error('Get sites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Client questionnaire - Get page
export const getClientPage = async (req, res) => {
  try {
    const { token, locale = 'kh', uuid, index } = req.params;
    
    if (token === 'index') {
      const tokens = await Token.findAll({ attributes: ['code', 'username'] });
      const sites = await Site.findAll({
        attributes: ['username', 'site', 'sitename', 'province', 'province_kh'],
        order: [['province', 'ASC']],
        distinct: true
      });
      return res.json({
        page: 'index',
        parent: 'client',
        token: 'index',
        tokens,
        sites,
        locale: locale || 'kh'
      });
    }

    if (!await verifyToken(token)) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    const tokenInfo = await Token.findByPk(token);
    if (!tokenInfo) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const site = locale === 'en' ? tokenInfo.site_en : tokenInfo.site_kh;

    if (!index) {
      // Initial page - generate UUID
      const newUuid = crypto.randomUUID();
      return res.json({
        page: 'client',
        token,
        locale: locale || 'kh',
        parent: 'client',
        uuid: newUuid,
        site
      });
    }

    if (index === 'thank') {
      return res.json({
        page: 'thank',
        token,
        locale: locale || 'kh',
        parent: 'client'
      });
    }

    // Return page data based on index
    res.json({
      page: index,
      token,
      locale: locale || 'kh',
      parent: 'client',
      uuid,
      site
    });
  } catch (error) {
    console.error('Get client page error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Client questionnaire - Save page
export const saveClientPage = async (req, res) => {
  try {
    const { token, index } = req.params;
    const { locale = 'kh', _uri, ...formData } = req.body;

    if (!await verifyToken(token)) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    const tokenInfo = await Token.findByPk(token);
    if (!tokenInfo) {
      return res.status(404).json({ error: 'Token not found' });
    }

    switch (index) {
      case 'consent':
        return await saveConsent(req, res, token, tokenInfo, locale, _uri, formData);
      case 'section1a':
        return await saveSection1a(req, res, token, locale, _uri, formData);
      case 'section1a1':
        return await saveSection1a1(req, res, token, locale, _uri, formData);
      case 'section1b':
        return await saveSection1b(req, res, token, locale, _uri, formData);
      case 'section1c':
        return await saveSection1c(req, res, token, locale, _uri, formData);
      case 'section5c':
        return await saveSection5c(req, res, token, locale, _uri, formData);
      case 'section6c':
        return await saveSection6c(req, res, token, locale, _uri, formData);
      default:
        return res.status(404).json({ error: 'Invalid section' });
    }
  } catch (error) {
    console.error('Save client page error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Save consent
const saveConsent = async (req, res, token, tokenInfo, locale, _uri, formData) => {
  try {
    if (!_uri) {
      console.error('[SaveConsent] ❌ ERROR: _uri is missing! Cannot save consent.');
      return res.status(400).json({ error: 'Missing _uri (UUID) required for consent' });
    }

    let userData = await UserData.findByPk(_uri);
    
    if (!userData) {
      userData = UserData.build({ _URI: _uri });
    }

    userData.ACKNOWLEDGE = formData.consent;
    userData.START = new Date();
    userData.USERNAME = tokenInfo.username;
    userData.DEVICEID = req.headers['user-agent']?.substring(0, 255) || '';
    
    // If user disagrees (ACKNOWLEDGE != 1), mark as complete and sync immediately
    const consentValue = formData.consent;
    if (consentValue != 1 && consentValue !== '1') {
      userData._IS_COMPLETE = 1;
      userData._SUBMISSION_DATE = new Date();
    }
    
    await userData.save();

    // Reload userData to ensure we have the latest data from database
    await userData.reload();

    // If user disagreed, sync to reporting table immediately
    if (consentValue != 1 && consentValue !== '1') {
      await syncToReportingTable(userData);
    }

    const redirectLocale = locale || 'kh';

    // Use loose equality to handle both string "1" and number 1
    if (consentValue == 1) {
      return res.json({
        redirect: `/client/${token}/${redirectLocale}/${_uri}/section1a`
      });
    } else {
      return res.json({
        redirect: `/client/${token}/${redirectLocale}/${_uri}/thank`
      });
    }
  } catch (error) {
    console.error('Save consent error:', error);
    res.status(500).json({ error: 'Failed to save consent' });
  }
};

// Save section 1a
const saveSection1a = async (req, res, token, locale, _uri, formData) => {
  try {
    const userData = await UserData.findByPk(_uri);
    if (!userData) {
      return res.status(404).json({ error: 'User data not found' });
    }

    userData.Q1A = formData.q1a;
    userData.Q2A = formData.q2a;
    userData.Q3A = formData.q3a;
    userData.Q4A = formData.q4a;
    userData.Q5A = formData.q5a;
    userData._IS_COMPLETE = 0;
    
    await userData.save();

    const redirectLocale = locale || 'kh';
    res.json({
      redirect: `/client/${token}/${redirectLocale}/${_uri}/section1a1`
    });
  } catch (error) {
    console.error('Save section1a error:', error);
    res.status(500).json({ error: 'Failed to save section1a' });
  }
};

// Save section 1a1
const saveSection1a1 = async (req, res, token, locale, _uri, formData) => {
  try {
    const userData = await UserData.findByPk(_uri);
    if (!userData) {
      return res.status(404).json({ error: 'User data not found' });
    }

    userData.Q6A = formData.q6a;
    userData.Q7A = formData.q7a;
    userData.Q8A = formData.q8a;
    userData.Q9A = formData.q9a;
    userData.Q10A = formData.q10a;
    
    await userData.save();

    const redirectLocale = locale || 'kh';
    res.json({
      redirect: `/client/${token}/${redirectLocale}/${_uri}/section1b`
    });
  } catch (error) {
    console.error('Save section1a1 error:', error);
    res.status(500).json({ error: 'Failed to save section1a1' });
  }
};

// Save section 1b
const saveSection1b = async (req, res, token, locale, _uri, formData) => {
  try {
    const userData = await UserData.findByPk(_uri);
    if (!userData) {
      return res.status(404).json({ error: 'User data not found' });
    }

    userData.Q1B = formData.q1b;
    userData.Q2B = formData.q2b;
    userData.Q3B = formData.q3b;
    userData.Q4B = formData.q4b;
    userData.Q5B = formData.q5b;

    await userData.save();

    const redirectLocale = locale || 'kh';
    res.json({
      redirect: `/client/${token}/${redirectLocale}/${_uri}/section1c`
    });
  } catch (error) {
    console.error('Save section1b error:', error);
    res.status(500).json({ error: 'Failed to save section1b' });
  }
};

// Save section 1c
const saveSection1c = async (req, res, token, locale, _uri, formData) => {
  try {
    const userData = await UserData.findByPk(_uri);
    if (!userData) {
      return res.status(404).json({ error: 'User data not found' });
    }

    userData.Q1C = formData.q1c;
    userData.Q2C = formData.q2c;
    userData.Q3C_1 = formData.q3c_1;
    userData.Q3C_2 = formData.q3c_2;
    userData.Q3C_3 = formData.q3c_3;
    userData.Q3C_4 = formData.q3c_4;
    userData.Q3C_5 = formData.q3c_5;
    userData.Q3C_6 = formData.q3c_6;
    userData.Q3C_7 = formData.q3c_7;
    userData.Q3C_8 = formData.q3c_8;
    userData.Q4C = formData.q4c; // Fixed: was q4b, should be q4c
    
    await userData.save();

    const redirectLocale = locale || 'kh';
    res.json({
      redirect: `/client/${token}/${redirectLocale}/${_uri}/section5c`
    });
  } catch (error) {
    console.error('Save section1c error:', error);
    res.status(500).json({ error: 'Failed to save section1c' });
  }
};

// Save section 5c
const saveSection5c = async (req, res, token, locale, _uri, formData) => {
  try {
    const userData = await UserData.findByPk(_uri);
    if (!userData) {
      return res.status(404).json({ error: 'User data not found' });
    }

    userData.Q5C1 = formData.q5c1;
    userData.Q5C2 = formData.q5c2;
    userData.Q5C3 = formData.q5c3;
    
    await userData.save();

    const redirectLocale = locale || 'kh';
    res.json({
      redirect: `/client/${token}/${redirectLocale}/${_uri}/section6c`
    });
  } catch (error) {
    console.error('Save section5c error:', error);
    res.status(500).json({ error: 'Failed to save section5c' });
  }
};

// Save section 6c
const saveSection6c = async (req, res, token, locale, _uri, formData) => {
  try {
    const userData = await UserData.findByPk(_uri);
    if (!userData) {
      return res.status(404).json({ error: 'User data not found' });
    }

    userData.Q6C_1 = formData.q6c_1;
    userData.Q6C_2 = formData.q6c_2;
    userData.Q6C_3 = formData.q6c_3;
    userData.Q6C_4 = formData.q6c_4;
    userData.Q6C_5 = formData.q6c_5;
    userData.Q6C_6 = formData.q6c_6;
    userData.Q6C_7 = formData.q6c_7;
    userData.Q6C_8 = formData.q6c_8;
    userData.Q7C = formData.q7c;
    userData.Q8C = formData.q8c;
    userData.Q9C_1 = formData.q9c_1;
    userData.Q9C_2 = formData.q9c_2;
    userData.Q9C_3 = formData.q9c_3;
    userData.Q9C_4 = formData.q9c_4;
    userData.Q9C_5 = formData.q9c_5;
    userData.Q10C = formData.q10c;
    userData.Q11C = formData.q11c;
    userData.Q12C = formData.q12c;
    userData.Q13C = formData.q13c;
    userData.Q14C = formData.q14c;
    userData._IS_COMPLETE = 1;
    userData._SUBMISSION_DATE = new Date();

    await userData.save();

    // Reload userData to ensure we have the latest data from database
    await userData.reload();

    await syncToReportingTable(userData);

    const redirectLocale = locale || 'kh';
    res.json({
      redirect: `/client/${token}/${redirectLocale}/${_uri}/thank`
    });
  } catch (error) {
    console.error('Save section6c error:', error);
    res.status(500).json({ error: 'Failed to save section6c' });
  }
};

// Provider questionnaire - Get page
export const getProviderPage = async (req, res) => {
  try {
    const { token, locale = 'kh', uuid, index } = req.params;
    
    if (token === 'index') {
      const tokens = await Token.findAll({ attributes: ['code', 'username'] });
      const sites = await Site.findAll({
        attributes: ['username', 'site', 'sitename', 'province', 'province_kh'],
        order: [['province', 'ASC']],
        distinct: true
      });
      return res.json({
        page: 'index',
        parent: 'provider',
        token: 'index',
        tokens,
        sites,
        locale: locale || 'kh'
      });
    }

    if (!await verifyToken(token)) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    const tokenInfo = await Token.findByPk(token);
    if (!tokenInfo) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const site = locale === 'en' ? tokenInfo.site_en : tokenInfo.site_kh;

    if (!index) {
      // Initial page - generate UUID
      const newUuid = crypto.randomUUID();
      return res.json({
        page: 'provider',
        token,
        locale: locale || 'kh',
        parent: 'provider',
        uuid: newUuid,
        site
      });
    }

    if (index === 'thank') {
      return res.json({
        page: 'thank',
        token,
        locale: locale || 'kh',
        parent: 'provider'
      });
    }

    // Return page data based on index
    res.json({
      page: index,
      token,
      locale: locale || 'kh',
      parent: 'provider',
      uuid,
      site
    });
  } catch (error) {
    console.error('Get provider page error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Provider questionnaire - Save page
export const saveProviderPage = async (req, res) => {
  try {
    const { token, index } = req.params;
    const { locale = 'kh', _uri, ...formData } = req.body;

    if (!await verifyToken(token)) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    const tokenInfo = await Token.findByPk(token);
    if (!tokenInfo) {
      return res.status(404).json({ error: 'Token not found' });
    }

    switch (index) {
      case 'consent':
        return await saveProviderConsent(req, res, token, tokenInfo, locale, _uri, formData);
      case 'section1':
        return await saveProviderSection1(req, res, token, locale, _uri, formData);
      default:
        return res.status(404).json({ error: 'Invalid section' });
    }
  } catch (error) {
    console.error('Save provider page error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Save provider consent
const saveProviderConsent = async (req, res, token, tokenInfo, locale, _uri, formData) => {
  try {
    let providerData = await ProviderData.findByPk(_uri);
    
    if (!providerData) {
      providerData = ProviderData.build({ _URI: _uri });
    }

    // Normalize consent to integer (1/0) so logic matches old system
    // Handle both string "0"/"1" and number 0/1
    let consentValue = null;
    if (formData.consent !== undefined && formData.consent !== null && formData.consent !== '') {
      consentValue = parseInt(formData.consent, 10);
      // Handle NaN case
      if (isNaN(consentValue)) {
        consentValue = formData.consent === '1' || formData.consent === 1 ? 1 : 0;
      }
    }

    providerData.ACKNOWLEDGE = consentValue;
    providerData.START = new Date();
    providerData.USERNAME = tokenInfo.username;
    providerData.DEVICEID = req.headers['user-agent']?.substring(0, 255) || '';
    // If consent = 1, questionnaire continues (not complete yet), otherwise it's complete
    providerData._IS_COMPLETE = consentValue === 1 ? 0 : 1;
    
    // If user declined consent (ACKNOWLEDGE = 0 or null), set submission date immediately
    // because the questionnaire is complete (they declined)
    if (consentValue !== 1) {
      providerData._SUBMISSION_DATE = new Date();
    }
    
    await providerData.save();

    const redirectLocale = locale || 'kh';
    if (consentValue === 1) {
      return res.json({
        redirect: `/provider/${token}/${redirectLocale}/${_uri}/section1`
      });
    } else {
      return res.json({
        redirect: `/provider/${token}/${redirectLocale}/${_uri}/thank`
      });
    }
  } catch (error) {
    console.error('Save provider consent error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      formData,
      _uri
    });
    res.status(500).json({ error: 'Failed to save consent', details: error.message });
  }
};

// Save provider section 1
const saveProviderSection1 = async (req, res, token, locale, _uri, formData) => {
  try {
    const providerData = await ProviderData.findByPk(_uri);
    if (!providerData) {
      return res.status(404).json({ error: 'Provider data not found' });
    }

    providerData.dept = formData.dept;
    // Preserve ACKNOWLEDGE value - only update if formData.consent is explicitly provided and is 1
    // If formData.consent is 0 or not provided, keep the existing ACKNOWLEDGE value
    if (formData.consent !== undefined && formData.consent !== null && formData.consent !== '') {
      const consentValue = parseInt(formData.consent, 10);
      if (!isNaN(consentValue) && consentValue === 1) {
        providerData.ACKNOWLEDGE = 1;
      }
      // If consentValue is 0, don't overwrite - they already agreed in consent step
    }
    providerData.e1 = formData.e1;
    providerData.e2 = formData.e2;
    providerData.e3 = formData.e3;
    providerData.e4 = formData.e4;
    providerData.e5 = formData.e5;
    providerData.e6 = formData.e6;
    providerData._SUBMISSION_DATE = new Date();
    providerData._IS_COMPLETE = 1;
    
    await providerData.save();

    const redirectLocale = locale || 'kh';
    res.json({
      redirect: `/provider/${token}/${redirectLocale}/${_uri}/thank`
    });
  } catch (error) {
    console.error('Save provider section1 error:', error);
    res.status(500).json({ error: 'Failed to save section1' });
  }
};

