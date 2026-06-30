import { sequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';

// Helper: Get user's accessible sites (returns locale-specific names for display)
// Note: For filtering, we check both site and sitename fields in the database queries
async function getUserSites(userId, roleId, locale = 'en') {
  const siteField = locale === 'en' ? 'sitename' : 'site';
  
  if (roleId === 1) {
    // Admin gets all sites - return only locale-specific names for display
    const results = await sequelize.query(
      `SELECT DISTINCT ${siteField} as site FROM tbl_sites WHERE ${siteField} IS NOT NULL`,
      { type: QueryTypes.SELECT }
    );
    return results.map(r => r.site);
  } else {
    // Get user's assigned sites - return only locale-specific names for display
    const results = await sequelize.query(
      `SELECT DISTINCT s.${siteField} as site 
       FROM tbl_sites s
       INNER JOIN user_belong2_sites ubs ON s.id = ubs.site_id
       WHERE ubs.model_id = :userId AND ubs.model_type = 'App\\\\User'
       AND s.${siteField} IS NOT NULL`,
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );
    
    const sites = results.map(r => r.site);
    
    // Check if user has "*" (all sites) permission
    if (sites.includes('*')) {
      const allSites = await sequelize.query(
        `SELECT DISTINCT ${siteField} as site FROM tbl_sites WHERE ${siteField} IS NOT NULL`,
        { type: QueryTypes.SELECT }
      );
      return allSites.map(r => r.site);
    }
    
    return sites;
  }
}

// Helper: Get user's accessible provinces based on assigned sites
async function getUserProvinces(userId, roleId, locale = 'en') {
  const provinceField = locale === 'en' ? 'province' : 'province_kh';
  
  if (roleId === 1) {
    // Admin gets all provinces
    return null; // Return null to indicate all provinces
  } else {
    // Get provinces from user's assigned sites
    const results = await sequelize.query(
      `SELECT DISTINCT s.${provinceField} as province_name 
       FROM tbl_sites s
       INNER JOIN user_belong2_sites ubs ON s.id = ubs.site_id
       WHERE ubs.model_id = :userId AND ubs.model_type = 'App\\\\User'
       AND s.${provinceField} IS NOT NULL AND s.${provinceField} != '' AND s.${provinceField} != '*'
       ORDER BY s.${provinceField} ASC`,
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );
    
    const provinces = results.map(r => r.province_name).filter(p => p);
    
    // Check if user has "*" (all sites) permission
    if (provinces.length === 0) {
      // Check if user has all sites permission
      const [siteResults] = await sequelize.query(
        `SELECT DISTINCT s.${provinceField} as province_name 
         FROM tbl_sites s
         INNER JOIN user_belong2_sites ubs ON s.id = ubs.site_id
         WHERE ubs.model_id = :userId AND ubs.model_type = 'App\\\\User'
         AND s.${provinceField} = '*'`,
        {
          replacements: { userId },
          type: QueryTypes.SELECT
        }
      );
      
      if (siteResults.length > 0) {
        return null; // All provinces
      }
    }
    
    // Convert province names to keys (for matching with province map)
    const provinceMap = await getProvinces(locale);
    const provinceKeys = [];
    
    provinces.forEach(provinceName => {
      // Find the key for this province name
      for (const [key, value] of Object.entries(provinceMap)) {
        if (value === provinceName) {
          provinceKeys.push(key);
          break;
        }
      }
    });
    
    return provinceKeys.length > 0 ? provinceKeys : null;
  }
}

// Helper: Get provinces from database
async function getProvinces(locale = 'en') {
  try {
    // Get unique provinces from both tbl_sites and patient/HFS data tables
    const provinceField = locale === 'en' ? 'province' : 'province_kh';
    
    // Query from tbl_sites first
    const siteProvinces = await sequelize.query(
      `SELECT DISTINCT ${provinceField} as province_name 
       FROM tbl_sites 
       WHERE ${provinceField} IS NOT NULL AND ${provinceField} != '' AND ${provinceField} != '*'
       ORDER BY ${provinceField} ASC`,
      { type: QueryTypes.SELECT }
    );
    
    // Also get from patient data table
    const patientProvinces = await sequelize.query(
      `SELECT DISTINCT ${provinceField} as province_name 
       FROM tbl_psf_patient_v4 
       WHERE ${provinceField} IS NOT NULL AND ${provinceField} != '' AND ${provinceField} != '*'
       ORDER BY ${provinceField} ASC`,
      { type: QueryTypes.SELECT }
    );
    
    // Also get from HFS data table
    const hfsProvinces = await sequelize.query(
      `SELECT DISTINCT ${provinceField} as province_name 
       FROM view_psf_hfs_self_assessment_v4 
       WHERE ${provinceField} IS NOT NULL AND ${provinceField} != '' AND ${provinceField} != '*'
       ORDER BY ${provinceField} ASC`,
      { type: QueryTypes.SELECT }
    );
    
    // Combine all provinces and remove duplicates
    const allProvinces = new Map();
    
    // Add provinces from sites
    siteProvinces.forEach(p => {
      if (p.province_name) {
        const key = p.province_name.toLowerCase().replace(/\s+/g, '_');
        allProvinces.set(key, p.province_name);
      }
    });
    
    // Add provinces from patient data
    patientProvinces.forEach(p => {
      if (p.province_name) {
        const key = p.province_name.toLowerCase().replace(/\s+/g, '_');
        allProvinces.set(key, p.province_name);
      }
    });
    
    // Add provinces from HFS data
    hfsProvinces.forEach(p => {
      if (p.province_name) {
        const key = p.province_name.toLowerCase().replace(/\s+/g, '_');
        allProvinces.set(key, p.province_name);
      }
    });
    
    // Convert Map to object
    const provincesObj = {};
    allProvinces.forEach((value, key) => {
      provincesObj[key] = value;
    });
    
    return provincesObj;
  } catch (error) {
    console.error('Error fetching provinces:', error);
    // Fallback to hardcoded list if database query fails
    return {
      'battambang': 'Battambang',
      'kampong_cham': 'Kampong Cham',
      'kampong_thom': 'Kampong Thom',
      'kandal': 'Kandal',
      'phnom_penh': 'Phnom Penh',
      'preah_sihanouk': 'Preah Sihanouk',
      'siem_reap': 'Siem Reap',
    };
  }
}

// Helper: Get KPs (Key Populations)
function getKPs() {
  return {
    'msm': 'MSM',
    'tg': 'TG',
    'few': 'FEW',
    'pwid': 'PWID',
    'gp': 'GP',
    'indet': 'INDET'
  };
}

// Helper: Get age ranges
function getAgeRanges() {
  return {
    'under_18': '< 18',
    '19_24': '19 to 24',
    '25_35': '25 to 35',
    '36_45': '36 to 45',
    'over_45': '> 45'
  };
}

// Helper: Get list of periods for dropdown
function getListPeriodReport() {
  const periods = [];
  const startDate = new Date('2020-01-01');
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 3); // 3 months in the future
  
  let currentDate = new Date(startDate);
  
  while (currentDate < endDate) {
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    const quarter = Math.ceil(month / 3);
    // Format: Q1-2024 (matches old system format)
    const periodValue = `Q${quarter}-${year}`;
    // Also support Q1 2024 format for compatibility
    const periodLabel = `Q${quarter} ${year}`;
    
    periods.push({ value: periodValue, label: periodLabel });
    
    // Move to next quarter
    currentDate.setMonth(currentDate.getMonth() + 3);
  }
  
  return periods;
}

// Helper: Convert date to quarter
function convertDateToQuarter(dateStr, isFiscalYear = false, byMonth = false) {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  
  if (byMonth) {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  
  if (isFiscalYear) {
    // Fiscal year: Oct-Sep
    if (month >= 10) {
      return `Q${Math.ceil((month - 9) / 3)} ${date.getFullYear() + 1}`;
    } else {
      return `Q${Math.ceil((month + 3) / 3)} ${date.getFullYear()}`;
    }
  } else {
    // Calendar year
    return `Q${Math.ceil(month / 3)} ${date.getFullYear()}`;
  }
}

// Helper: Get report months by quarter
// Returns months in "F-y" format (e.g., "December-25") to match old system
function getReportMonthsByQuarter(period, isFiscalYear) {
  // Parse period like "Q1 2024", "Q1-2024", or "Q1 2025"
  const match = period.match(/Q(\d)[\s-]+(\d{4})/);
  if (!match) {
    console.error('Invalid period format:', period);
    return [];
  }
  
  const quarter = parseInt(match[1]);
  const year = parseInt(match[2]);
  const months = [];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
  
  if (isFiscalYear) {
    // Fiscal year quarters: Q1=Oct-Dec, Q2=Jan-Mar, Q3=Apr-Jun, Q4=Jul-Sep
    const monthMap = {
      1: [10, 11, 12],
      2: [1, 2, 3],
      3: [4, 5, 6],
      4: [7, 8, 9]
    };
    const quarterMonths = monthMap[quarter] || [];
    quarterMonths.forEach(m => {
      const y = (quarter === 1) ? year - 1 : year;
      const monthName = monthNames[m - 1];
      const yearShort = String(y).slice(-2);
      months.push(`${monthName}-${yearShort}`);
    });
  } else {
    // Calendar year quarters
    const startMonth = (quarter - 1) * 3 + 1;
    for (let i = 0; i < 3; i++) {
      const monthNum = startMonth + i;
      const monthName = monthNames[monthNum - 1];
      const yearShort = String(year).slice(-2);
      months.push(`${monthName}-${yearShort}`);
    }
  }
  
  return months;
}

// Get reporting table data
export const getReportingTable = async (req, res) => {
  try {
    // Support both GET and POST
    const { startdate, enddate, sites } = req.method === 'GET' ? req.query : req.body;
    const userId = req.user?.id;
    const locale = (req.method === 'GET' ? req.query.locale : req.body.locale) || 'en';
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    
    // Get user's roleId from database if not in token
    let roleId = req.user?.roleId;
    if (!roleId) {
      const [roleResults] = await sequelize.query(
        `SELECT r.id 
         FROM roles r
         INNER JOIN model_has_roles mhr ON r.id = mhr.role_id
         WHERE mhr.model_id = ? AND mhr.model_type = 'App\\\\User'
         ORDER BY r.id ASC
         LIMIT 1`,
        { replacements: [userId] }
      );
      roleId = roleResults.length > 0 ? roleResults[0].id : null;
    }
    
    // Get user's accessible sites
    let userSites = [];
    try {
      userSites = await getUserSites(userId, roleId, locale);
    } catch (error) {
      console.error('Error getting user sites:', error);
      userSites = [];
    }
    
    if (!startdate || !enddate) {
      return res.json({
        success: true,
        data: [],
        sites: userSites
      });
    }
    
    // Normalize dates to include full day range
    // If dates don't include time, add time to include full day
    let normalizedStartDate = startdate;
    let normalizedEndDate = enddate;
    
    // If enddate is just a date (no time), append end of day time
    if (enddate && !enddate.includes(' ') && !enddate.includes('T')) {
      normalizedEndDate = `${enddate} 23:59:59`;
    }
    
    // If startdate is just a date (no time), append start of day time
    if (startdate && !startdate.includes(' ') && !startdate.includes('T')) {
      normalizedStartDate = `${startdate} 00:00:00`;
    }
    
    // Determine which sites to filter
    // userSites contains locale-specific site names for display
    // For filtering, we need to get both language versions to match against database
    let filterSites = userSites;
    if (sites && Array.isArray(sites) && sites.length > 0) {
      if (sites.includes('*')) {
        // If '*' is selected, use all user's assigned sites
        filterSites = userSites;
      } else {
        // Filter to only include sites that user has access to
        // First, match requested sites against userSites (locale-specific)
        filterSites = sites.filter(s => {
          const siteStr = String(s).trim().toLowerCase();
          return userSites.some(us => String(us).trim().toLowerCase() === siteStr);
        });
        
        // If requested sites match userSites, get both language versions for database filtering
        // This ensures we can match against both site and sitename fields in the database
        if (filterSites.length > 0) {
          try {
            const filterSitesLower = filterSites.map(s => String(s).trim().toLowerCase());
            const siteMappingResults = await sequelize.query(
              `SELECT DISTINCT site, sitename FROM tbl_sites 
               WHERE LOWER(COALESCE(site, '')) IN (:filterSites) 
               OR LOWER(COALESCE(sitename, '')) IN (:filterSites)`,
              {
                replacements: { filterSites: filterSitesLower },
                type: QueryTypes.SELECT
              }
            );
            
            // Get all site names (both languages) for the matched sites
            const allLanguageSites = [];
            siteMappingResults.forEach(r => {
              if (r.site) allLanguageSites.push(r.site);
              if (r.sitename) allLanguageSites.push(r.sitename);
            });
            
            if (allLanguageSites.length > 0) {
              filterSites = [...new Set(allLanguageSites)]; // Remove duplicates, includes both languages
            }
          } catch (mappingError) {
            console.error('Error mapping site names for filtering:', mappingError);
            // Fallback: use the original filterSites (locale-specific)
          }
        }
      }
    }
    
    const siteField = locale === 'en' ? 'sitename' : 'site';
    
    // Build query - handle both lowercase and uppercase field names
    // Include all records (both agree and disagree) for export
    let query = `
      SELECT * FROM tbl_psf_patient_v4
      WHERE (start BETWEEN :startdate AND :enddate OR START BETWEEN :startdate AND :enddate)
    `;
    
    const replacements = { startdate: normalizedStartDate, enddate: normalizedEndDate };
    
    if (filterSites.length > 0) {
      // Check both site and sitename fields - filterSites may contain both English and Khmer names
      // Use case-insensitive comparison by converting both sides to uppercase
      query += ` AND (
        UPPER(COALESCE(site, SITE, '')) IN (:sites)
        OR UPPER(COALESCE(sitename, SITENAME, '')) IN (:sites)
      )`;
      // Convert filterSites to uppercase for case-insensitive matching
      replacements.sites = filterSites.map(s => String(s).trim().toUpperCase());
    }
    
    query += ` ORDER BY COALESCE(start, START) DESC`;
    
    let data = [];
    try {
      data = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      });
      } catch (error) {
        console.error('Query error:', error);
        // Try with simpler query if the above fails - use DATE() function for date-only comparison
        try {
          // Extract just the date part for DATE() comparison
          const startDateOnly = startdate.split(' ')[0].split('T')[0];
          const endDateOnly = enddate.split(' ')[0].split('T')[0];
          
          let simpleQuery = `
            SELECT * FROM tbl_psf_patient_v4
            WHERE DATE(start) BETWEEN :startdate AND :enddate
          `;
          
          const simpleReplacements = { startdate: startDateOnly, enddate: endDateOnly };
          
          if (filterSites.length > 0) {
            // Check both site and sitename fields like the main query
            // Use case-insensitive comparison - filterSites may contain both English and Khmer names
            simpleQuery += ` AND (
              UPPER(COALESCE(site, SITE, '')) IN (:sites)
              OR UPPER(COALESCE(sitename, SITENAME, '')) IN (:sites)
            )`;
            // Convert filterSites to uppercase for case-insensitive matching
            simpleReplacements.sites = filterSites.map(s => String(s).trim().toUpperCase());
          }
          
          simpleQuery += ` ORDER BY start DESC`;
          
          data = await sequelize.query(simpleQuery, {
            replacements: simpleReplacements,
            type: QueryTypes.SELECT
          });
        } catch (simpleError) {
          console.error('Simple query also failed:', simpleError);
          throw simpleError;
        }
      }
    
    // Normalize ACKNOWLEDGE field to ensure consistent field name and handle case variations
    data = data.map((row) => {
      const acknowledge = row.ACKNOWLEDGE !== undefined ? row.ACKNOWLEDGE : 
                         (row.acknowledge !== undefined ? row.acknowledge : 
                         (row.Acknowledge !== undefined ? row.Acknowledge : null));
      const normalizedRow = { ...row };
      normalizedRow.ACKNOWLEDGE = acknowledge;
      return normalizedRow;
    });
    
    res.json({
      success: true,
      data,
      sites: userSites
    });
  } catch (error) {
    console.error('Get reporting table error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Get dashboard data with charts
export const getDashboard = async (req, res) => {
  try {
    const { period, periods, sites, kps, provinces, ages, isFiscalYear, byMonth, locale } = req.body;
    const userId = req.user?.id;
    const userLocale = locale || 'en';
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Get user's roleId from database if not in token
    let roleId = req.user?.roleId;
    if (!roleId) {
      const [roleResults] = await sequelize.query(
        `SELECT r.id 
         FROM roles r
         INNER JOIN model_has_roles mhr ON r.id = mhr.role_id
         WHERE mhr.model_id = ? AND mhr.model_type = 'App\\\\User'
         ORDER BY r.id ASC
         LIMIT 1`,
        { replacements: [userId] }
      );
      roleId = roleResults.length > 0 ? roleResults[0].id : null;
    }
    
    // Get user's accessible sites
    let userSites = [];
    try {
      userSites = await getUserSites(userId, roleId, userLocale);
    } catch (error) {
      console.error('Error getting user sites:', error);
      // Default to empty array if sites query fails
      userSites = [];
    }
    
    // Handle multiple periods - support both 'period' (single/comma-separated) and 'periods' (array)
    let periodList = [];
    if (periods && Array.isArray(periods) && periods.length > 0) {
      periodList = periods;
    } else if (periods && typeof periods === 'string') {
      // Handle comma-separated string
      periodList = periods.split(',').map(p => p.trim()).filter(p => p);
    } else if (period) {
      // Handle single period or comma-separated string
      if (typeof period === 'string' && period.includes(',')) {
        periodList = period.split(',').map(p => p.trim()).filter(p => p);
      } else {
        periodList = [period];
      }
    }
    
    // If no periods, return early with empty data
    if (!periodList || periodList.length === 0) {
      return res.json({
        success: true,
        data: {
          participationChart: [],
          platformChart: [],
          kpChart: {},
          providerSatisfactionChart: [],
          serviceSatisfactionChart: [],
          patientSatisfactionChart: [],
          providerAttitudeChart: [],
          patientCommentsChart: { total: 0 }
        },
        sites: userSites,
        provinces: await getProvinces(userLocale),
        userProvinces: await getUserProvinces(userId, roleId, userLocale),
        kps: getKPs(),
        ages: getAgeRanges(),
        periods: getListPeriodReport()
      });
    }
    
    // Determine filter sites
    let filterSites = userSites;
    if (sites && Array.isArray(sites) && sites.length > 0) {
      if (!sites.includes('*')) {
        // Filter to only include sites that user has access to
        filterSites = sites.filter(s => userSites.includes(s));
      } else {
        // If '*' is selected, use all user's assigned sites
        filterSites = userSites;
      }
    }
    
    // Get report months for all selected periods
    let reportMonths = [];
    const allReportMonths = new Set(); // Use Set to avoid duplicates
    
    try {
      for (const periodValue of periodList) {
        const months = getReportMonthsByQuarter(periodValue, isFiscalYear || false);
        if (months && months.length > 0) {
          months.forEach(month => allReportMonths.add(month));
        }
      }
      
      reportMonths = Array.from(allReportMonths);
      
      if (!reportMonths || reportMonths.length === 0) {
        // If period parsing fails, return empty data
        return res.json({
          success: true,
          data: {
            participationChart: [],
            platformChart: [],
            kpChart: {},
            providerSatisfactionChart: [],
            serviceSatisfactionChart: [],
            patientSatisfactionChart: [],
            providerAttitudeChart: [],
            patientCommentsChart: { total: 0 }
          },
          sites: userSites,
          provinces: await getProvinces(userLocale),
          userProvinces: await getUserProvinces(userId, roleId, userLocale),
          kps: getKPs(),
          ages: getAgeRanges(),
          periods: getListPeriodReport()
        });
      }
    } catch (error) {
      console.error('Error parsing periods:', error);
      return res.json({
        success: true,
        data: {
          participationChart: [],
          platformChart: [],
          kpChart: {},
          providerSatisfactionChart: [],
          serviceSatisfactionChart: [],
          patientSatisfactionChart: [],
          providerAttitudeChart: [],
          patientCommentsChart: { total: 0 }
        },
        sites: userSites,
        provinces: await getProvinces(userLocale),
        kps: getKPs(),
        ages: getAgeRanges(),
        periods: getListPeriodReport()
      });
    }
    
    // Build where conditions
    const whereConditions = [];
    const replacements = {};
    
    const siteField = userLocale === 'en' ? 'sitename' : 'site';
    const provinceField = userLocale === 'en' ? 'province' : 'province_kh';
    
    // Only add site filter if we have sites to filter by
    // Handle both lowercase and uppercase field names, and both site and sitename fields
    // The old system always used 'site' field, so we check both to ensure compatibility
    if (filterSites && filterSites.length > 0) {
      // Check both site and sitename fields to match old system behavior
      whereConditions.push(`(
        COALESCE(site, SITE, sitename, SITENAME) IN (:sites) 
        OR COALESCE(sitename, SITENAME, site, SITE) IN (:sites)
      )`);
      replacements.sites = filterSites;
    }
    
    // KP filter
    if (kps && kps.length > 0) {
      const kpValue = kps[0];
      let kpCondition = '';
      
      switch (kpValue) {
        case 'msm':
          kpCondition = "(Q8C = 1 AND Q9C_1 = 1 AND Q11C = 0)";
          break;
        case 'tg':
          kpCondition = "(Q8C = 3 AND Q11C = 0)";
          break;
        case 'few':
          kpCondition = "(Q8C = 2 AND Q10C = 1 AND Q11C = 0)";
          break;
        case 'pwid':
          kpCondition = "(((Q8C = 1 AND Q9C_2 = 1) OR (Q8C = 2 AND Q10C = 0)) AND Q11C = 1)";
          break;
        case 'gp':
          kpCondition = "(((Q8C = 1 AND Q9C_2 = 1) OR (Q8C = 2 AND Q10C = 0)) AND Q11C = 0)";
          break;
        case 'indet':
          kpCondition = "NOT ((Q8C = 3 AND Q11C = 0) OR (Q8C = 1 AND Q9C_1 = 1 AND Q11C = 0) OR (Q8C = 2 AND Q10C = 1 AND Q11C = 0) OR (((Q8C = 1 AND Q9C_2 = 1) OR (Q8C = 2 AND Q10C = 0)) AND Q11C = 1) OR (((Q8C = 1 AND Q9C_2 = 1) OR (Q8C = 2 AND Q10C = 0)) AND Q11C = 0))";
          break;
      }
      
      if (kpCondition) {
        whereConditions.push(kpCondition);
      }
    }
    
    // Age filter
    if (ages && ages.length > 0) {
      const ageValue = ages[0];
      const ageMap = {
        'under_18': 1,
        '19_24': 2,
        '25_35': 3,
        '36_45': 4,
        'over_45': 5
      };
      if (ageMap[ageValue]) {
        whereConditions.push(`Q7C = :age`);
        replacements.age = ageMap[ageValue];
      }
    }
    
    // Province filter
    if (provinces && provinces.length > 0 && provinces[0]) {
      // Map province key to actual province name
      const provinceMap = await getProvinces(userLocale);
      const provinceKey = provinces[0];
      const provinceName = provinceMap[provinceKey] || provinceKey; // Fallback to key if not found
      whereConditions.push(`${provinceField} = :province`);
      replacements.province = provinceName;
    }
    
    // Build query - use Month column (capital M) directly, derive from START if NULL
    // The actual column name in database is 'Month' (capital M only)
    const monthDerived = `COALESCE(
      NULLIF(Month, ''), 
      NULLIF(month, ''),
      NULLIF(MONTH, ''),
      CONCAT(
        CASE MONTH(COALESCE(start, START))
          WHEN 1 THEN 'January' WHEN 2 THEN 'February' WHEN 3 THEN 'March'
          WHEN 4 THEN 'April' WHEN 5 THEN 'May' WHEN 6 THEN 'June'
          WHEN 7 THEN 'July' WHEN 8 THEN 'August' WHEN 9 THEN 'September'
          WHEN 10 THEN 'October' WHEN 11 THEN 'November' WHEN 12 THEN 'December'
        END,
        '-',
        RIGHT(YEAR(COALESCE(start, START)), 2)
      )
    )`;
    
    let query = `
      SELECT *, ${monthDerived} AS month_value FROM tbl_psf_patient_v4
      WHERE ${monthDerived} IN (:months)
      AND COALESCE(ACKNOWLEDGE, acknowledge, Acknowledge, 0) = 1
    `;
    
    replacements.months = reportMonths;
    
    if (whereConditions.length > 0) {
      query += ` AND ${whereConditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY COALESCE(start, START) ASC`;
    
    let dataset = [];
    try {
      dataset = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      });
    } catch (error) {
      console.error('Error executing query:', error);
      console.error('Error stack:', error.stack);
      // Return empty dataset if query fails
      dataset = [];
    }
    
    // Process data for charts
    const chartData = processChartData(dataset, reportMonths, isFiscalYear || false, byMonth || false);
    
    const provincesList = await getProvinces(userLocale);
    const userProvinces = await getUserProvinces(userId, roleId, userLocale);
    
    res.json({
      success: true,
      data: chartData,
      sites: userSites,
      provinces: provincesList,
      userProvinces: userProvinces, // Provinces based on user's assigned sites
      kps: getKPs(),
      ages: getAgeRanges(),
      periods: getListPeriodReport()
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Process dataset into chart data
function processChartData(dataset, reportMonths, isFiscalYear, byMonth) {
  const participationData = [];
  const platformData = [];
  const kpData = {};
  const providerSatisfactionData = [];
  const serviceSatisfactionData = [];
  const patientSatisfactionData = [];
  const providerAttitudeData = [];
  const patientCommentsData = {};
  
  // Group by quarter/month
  const quarterGroups = {};
  
  // Helper to get month value from record (handle different case variations)
  // Use month_value first (the alias from query), then Month (actual column), then derive from START
  const getRecordMonth = (record) => {
    return record.month_value || record.Month || record.month || record.MONTH || 
           (record.START ? (() => {
             const start = new Date(record.START || record.start || record.Start);
             const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                                'July', 'August', 'September', 'October', 'November', 'December'];
             return `${monthNames[start.getMonth()]}-${String(start.getFullYear()).slice(-2)}`;
           })() : null);
  };
  
  // Helper to check if ACKNOWLEDGE means agree
  // ACKNOWLEDGE: 1 = agree (consented, continue questionnaire), 0 = disagree (didn't consent)
  const isAcknowledged = (record) => {
    const acknowledge = record.ACKNOWLEDGE !== undefined ? record.ACKNOWLEDGE : 
                       (record.acknowledge !== undefined ? record.acknowledge : 
                       (record.Acknowledge !== undefined ? record.Acknowledge : null));
    // 1 or '1' means agree, everything else (0, null, undefined) means disagree
    return acknowledge == 1 || acknowledge === '1' || acknowledge === 1;
  };
  
  // First, group all records by their month value
  dataset.forEach(record => {
    const recordMonth = getRecordMonth(record);
    if (!recordMonth) return;
    
    // Parse month to get quarter
    const monthMatch = recordMonth.match(/(\w+)-(\d{2})/);
    if (!monthMatch) return;
    
    const monthName = monthMatch[1];
    const yearShort = parseInt('20' + monthMatch[2]);
    const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'].indexOf(monthName);
    if (monthIndex === -1) return;
    
    const date = new Date(yearShort, monthIndex, 1);
    const quarter = convertDateToQuarter(date.toISOString(), isFiscalYear, byMonth);
    
    if (!quarterGroups[quarter]) {
      quarterGroups[quarter] = [];
    }
    
    // Only add if this month is in the reportMonths we're looking for
    if (reportMonths.includes(recordMonth)) {
      quarterGroups[quarter].push(record);
    }
  });
  
  // Process participation chart
  Object.keys(quarterGroups).forEach(quarter => {
    const records = quarterGroups[quarter];
    let agreeCount = 0;
    let disagreeCount = 0;
    
    records.forEach(record => {
      if (isAcknowledged(record)) agreeCount++;
      else disagreeCount++;
    });
    
    participationData.push({
      quarter,
      agree: agreeCount,
      disagree: disagreeCount
    });
  });
  
  // Process platform chart
  Object.keys(quarterGroups).forEach(quarter => {
    const records = quarterGroups[quarter];
    let odkCount = 0;
    let onlineCount = 0;
    
    records.forEach(record => {
      if (isAcknowledged(record)) {
        if (record.META_INSTANCE_ID) odkCount++;
        else onlineCount++;
      }
    });
    
    platformData.push({
      quarter,
      odk: odkCount,
      online: onlineCount
    });
  });
  
  // Process KP chart
  dataset.forEach(record => {
    let kp = 'INDET';
    
    // Use loose equality (==) to handle both string and number values
    if (record.Q8C == 3 && record.Q11C == 0) {
      kp = 'TG';
    } else if (record.Q8C == 1 && record.Q9C_1 == 1 && record.Q11C == 0) {
      kp = 'MSM';
    } else if (record.Q8C == 2 && record.Q10C == 1 && record.Q11C == 0) {
      kp = 'FEW';
    } else if (((record.Q8C == 1 && record.Q9C_2 == 1) || (record.Q8C == 2 && record.Q10C == 0)) && record.Q11C == 1) {
      kp = 'PWID';
    } else if (((record.Q8C == 1 && record.Q9C_2 == 1) || (record.Q8C == 2 && record.Q10C == 0)) && record.Q11C == 0) {
      kp = 'GP';
    }
    
    kpData[kp] = (kpData[kp] || 0) + 1;
  });
  
  // Process provider satisfaction chart
  Object.keys(quarterGroups).forEach(quarter => {
    const records = quarterGroups[quarter];
    const stats = {
      overall: { total: 0, satisfied: 0 },
      receptionist: { total: 0, satisfied: 0 },
      counselor: { total: 0, satisfied: 0 },
      doctor: { total: 0, satisfied: 0 },
      pharmacist: { total: 0, satisfied: 0 }
    };
    
    records.forEach(record => {
      // Handle both string and number values
      if (record.Q1A != null) {
        stats.overall.total++;
        if (record.Q1A == 3) stats.overall.satisfied++;
      }
      if (record.Q2A != null) {
        stats.receptionist.total++;
        if (record.Q2A == 3) stats.receptionist.satisfied++;
      }
      if (record.Q3A != null) {
        stats.counselor.total++;
        if (record.Q3A == 3) stats.counselor.satisfied++;
      }
      if (record.Q4A != null) {
        stats.doctor.total++;
        if (record.Q4A == 3) stats.doctor.satisfied++;
      }
      if (record.Q5A != null) {
        stats.pharmacist.total++;
        if (record.Q5A == 3) stats.pharmacist.satisfied++;
      }
    });
    
    providerSatisfactionData.push({
      quarter,
      overall: stats.overall.total > 0 ? Math.round((stats.overall.satisfied / stats.overall.total) * 100) : 0,
      receptionist: stats.receptionist.total > 0 ? Math.round((stats.receptionist.satisfied / stats.receptionist.total) * 100) : 0,
      counselor: stats.counselor.total > 0 ? Math.round((stats.counselor.satisfied / stats.counselor.total) * 100) : 0,
      doctor: stats.doctor.total > 0 ? Math.round((stats.doctor.satisfied / stats.doctor.total) * 100) : 0,
      pharmacist: stats.pharmacist.total > 0 ? Math.round((stats.pharmacist.satisfied / stats.pharmacist.total) * 100) : 0
    });
  });
  
  // Process service satisfaction chart
  Object.keys(quarterGroups).forEach(quarter => {
    const records = quarterGroups[quarter];
    const stats = {
      anc: { total: 0, satisfied: 0 },
      sti: { total: 0, satisfied: 0 },
      lab: { total: 0, satisfied: 0 },
      tb: { total: 0, satisfied: 0 },
      psycho: { total: 0, satisfied: 0 }
    };
    
    records.forEach(record => {
      // Use loose equality (==) to handle both string and number values
      if (record.Q1B != null && record.Q1B != 4) {
        stats.anc.total++;
        if (record.Q1B == 3) stats.anc.satisfied++;
      }
      if (record.Q2B != null && record.Q2B != 4) {
        stats.sti.total++;
        if (record.Q2B == 3) stats.sti.satisfied++;
      }
      if (record.Q3B != null && record.Q3B != 4) {
        stats.lab.total++;
        if (record.Q3B == 3) stats.lab.satisfied++;
      }
      if (record.Q4B != null && record.Q4B != 4) {
        stats.tb.total++;
        if (record.Q4B == 3) stats.tb.satisfied++;
      }
      if (record.Q5B != null && record.Q5B != 4) {
        stats.psycho.total++;
        if (record.Q5B == 3) stats.psycho.satisfied++;
      }
    });
    
    serviceSatisfactionData.push({
      quarter,
      anc: stats.anc.total > 0 ? Math.round((stats.anc.satisfied / stats.anc.total) * 100) : 0,
      sti: stats.sti.total > 0 ? Math.round((stats.sti.satisfied / stats.sti.total) * 100) : 0,
      lab: stats.lab.total > 0 ? Math.round((stats.lab.satisfied / stats.lab.total) * 100) : 0,
      tb: stats.tb.total > 0 ? Math.round((stats.tb.satisfied / stats.tb.total) * 100) : 0,
      psycho: stats.psycho.total > 0 ? Math.round((stats.psycho.satisfied / stats.psycho.total) * 100) : 0
    });
  });
  
  // Process patient satisfaction chart
  Object.keys(quarterGroups).forEach(quarter => {
    const records = quarterGroups[quarter];
    const stats = {
      waitingTime: { total: 0, satisfied: 0 },
      workingHours: { total: 0, satisfied: 0 },
      equalCounseling: { total: 0, satisfied: 0 },
      privacy: { total: 0, satisfied: 0 }
    };
    
    records.forEach(record => {
      // Use loose equality (==) to handle both string and number values
      if (record.Q6A != null) {
        stats.waitingTime.total++;
        if (record.Q6A == 1) stats.waitingTime.satisfied++;
      }
      if (record.Q7A != null) {
        stats.workingHours.total++;
        if (record.Q7A == 1) stats.workingHours.satisfied++;
      }
      if (record.Q8A != null) {
        stats.equalCounseling.total++;
        if (record.Q8A == 1) stats.equalCounseling.satisfied++;
      }
      if (record.Q10A != null) {
        stats.privacy.total++;
        if (record.Q10A == 1) stats.privacy.satisfied++;
      }
    });
    
    patientSatisfactionData.push({
      quarter,
      waitingTime: stats.waitingTime.total > 0 ? Math.round((stats.waitingTime.satisfied / stats.waitingTime.total) * 100) : 0,
      workingHours: stats.workingHours.total > 0 ? Math.round((stats.workingHours.satisfied / stats.workingHours.total) * 100) : 0,
      equalCounseling: stats.equalCounseling.total > 0 ? Math.round((stats.equalCounseling.satisfied / stats.equalCounseling.total) * 100) : 0,
      privacy: stats.privacy.total > 0 ? Math.round((stats.privacy.satisfied / stats.privacy.total) * 100) : 0
    });
  });
  
  // Process provider attitude chart
  Object.keys(quarterGroups).forEach(quarter => {
    const records = quarterGroups[quarter];
    const stats = {
      feelSafe: { total: 0, satisfied: 0 },
      feelRespected: { total: 0, satisfied: 0 },
      easyInfo: { total: 0, satisfied: 0 }
    };
    
    records.forEach(record => {
      // Use loose equality (==) to handle both string and number values
      if (record.Q5C1 != null) {
        stats.feelSafe.total++;
        if (record.Q5C1 == 1) stats.feelSafe.satisfied++;
      }
      if (record.Q5C2 != null) {
        stats.feelRespected.total++;
        if (record.Q5C2 == 1) stats.feelRespected.satisfied++;
      }
      if (record.Q5C3 != null) {
        stats.easyInfo.total++;
        if (record.Q5C3 == 1) stats.easyInfo.satisfied++;
      }
    });
    
    providerAttitudeData.push({
      quarter,
      feelSafe: stats.feelSafe.total > 0 ? Math.round((stats.feelSafe.satisfied / stats.feelSafe.total) * 100) : 0,
      feelRespected: stats.feelRespected.total > 0 ? Math.round((stats.feelRespected.satisfied / stats.feelRespected.total) * 100) : 0,
      easyInfo: stats.easyInfo.total > 0 ? Math.round((stats.easyInfo.satisfied / stats.easyInfo.total) * 100) : 0
    });
  });
  
  // Process patient comments chart
  const comments = {
    reduceWaitingTime: 0,
    moreFriendlyProvider: 0,
    staffPresent: 0,
    staffFocusOnPatient: 0,
    cleanWaitingRoom: 0,
    cleanToilet: 0,
    serviceEvery6Month: 0
  };
  let totalComments = 0;
  
  dataset.forEach(record => {
    // Use loose equality (==) to handle both string and number values
    if (record.Q6C_1 == 0) {
      if (record.Q6C_2 == 1) comments.reduceWaitingTime++;
      if (record.Q6C_3 == 1) comments.moreFriendlyProvider++;
      if (record.Q6C_4 == 1) comments.staffPresent++;
      if (record.Q6C_5 == 1) comments.staffFocusOnPatient++;
      if (record.Q6C_6 == 1) comments.cleanWaitingRoom++;
      if (record.Q6C_7 == 1) comments.cleanToilet++;
      if (record.Q6C_8 == 1) comments.serviceEvery6Month++;
      
      if (record.Q6C_2 == 1 || record.Q6C_3 == 1 || record.Q6C_4 == 1 || 
          record.Q6C_5 == 1 || record.Q6C_6 == 1 || record.Q6C_7 == 1 || record.Q6C_8 == 1) {
        totalComments++;
      }
    }
  });
  
  return {
    participationChart: participationData,
    platformChart: platformData,
    kpChart: kpData,
    providerSatisfactionChart: providerSatisfactionData,
    serviceSatisfactionChart: serviceSatisfactionData,
    patientSatisfactionChart: patientSatisfactionData,
    providerAttitudeChart: providerAttitudeData,
    patientCommentsChart: { ...comments, total: totalComments }
  };
}

// Process HFS dataset into chart data
function processHFSChartData(dataset, reportMonths, isFiscalYear) {
  const participationData = [];
  const deptData = {};
  const observedUnwillingServiceData = [];
  const observedLowQualityServiceData = [];
  const doubleGloveData = [];
  const drawBloodData = [];
  const enoughEquipmentData = [];
  const serviceQualityData = [];
  
  // Group by quarter/month
  const quarterGroups = {};
  
  // Helper to get month value from record
  const getRecordMonth = (record) => {
    return record.month_value || record.Month || record.month || record.MONTH || 
           (record.START ? (() => {
             const start = new Date(record.START || record.start || record.Start);
             const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                                'July', 'August', 'September', 'October', 'November', 'December'];
             return `${monthNames[start.getMonth()]}-${String(start.getFullYear()).slice(-2)}`;
           })() : null);
  };
  
  // Helper to check if DEPT exists (not null)
  const hasDept = (record) => {
    return record.DEPT != null && record.DEPT !== '';
  };
  
  // Group all records by their month value
  dataset.forEach(record => {
    const recordMonth = getRecordMonth(record);
    if (!recordMonth) return;
    
    // Parse month to get quarter
    const monthMatch = recordMonth.match(/(\w+)-(\d{2})/);
    if (!monthMatch) return;
    
    const monthName = monthMatch[1];
    const yearShort = parseInt('20' + monthMatch[2]);
    const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'].indexOf(monthName);
    if (monthIndex === -1) return;
    
    const date = new Date(yearShort, monthIndex, 1);
    const quarter = convertDateToQuarter(date.toISOString(), isFiscalYear, false);
    
    if (!quarterGroups[quarter]) {
      quarterGroups[quarter] = [];
    }
    
    // Only add if this month is in the reportMonths we're looking for
    if (reportMonths.includes(recordMonth)) {
      quarterGroups[quarter].push(record);
    }
  });
  
  // Process participation chart (count records with DEPT != null by quarter)
  Object.keys(quarterGroups).forEach(quarter => {
    const records = quarterGroups[quarter];
    let count = 0;
    
    records.forEach(record => {
      if (hasDept(record)) {
        count++;
      }
    });
    
    if (count > 0) {
      participationData.push({
        quarter,
        count
      });
    }
  });
  
  // Process department chart (count by DEPT value)
  dataset.forEach(record => {
    if (!hasDept(record)) return;
    
    const dept = record.DEPT;
    let deptName = 'Other';
    
    // Map DEPT values: 1=ART, 2=ANC, 3=HIV/STI, 4=Lab, 5=Methadone, 6=TB, 99=Other
    if (dept == 1) deptName = 'ART';
    else if (dept == 2) deptName = 'ANC';
    else if (dept == 3) deptName = 'HIV/STI';
    else if (dept == 4) deptName = 'Lab';
    else if (dept == 5) deptName = 'Methadone';
    else if (dept == 6) deptName = 'TB';
    else if (dept == 99) deptName = 'Other';
    
    deptData[deptName] = (deptData[deptName] || 0) + 1;
  });
  
  // Process observed unwilling service chart (E1 == 1)
  Object.keys(quarterGroups).forEach(quarter => {
    const records = quarterGroups[quarter];
    let observed = 0;
    let total = 0;
    
    records.forEach(record => {
      if (record.E1 != null) {
        total++;
        if (record.E1 == 1) observed++;
      }
    });
    
    if (total > 0) {
      observedUnwillingServiceData.push({
        quarter,
        percentage: Math.round((observed / total) * 100 * 10) / 10
      });
    }
  });
  
  // Process observed low quality service chart (E2 == 1)
  Object.keys(quarterGroups).forEach(quarter => {
    const records = quarterGroups[quarter];
    let observed = 0;
    let total = 0;
    
    records.forEach(record => {
      if (record.E2 != null) {
        total++;
        if (record.E2 == 1) observed++;
      }
    });
    
    if (total > 0) {
      observedLowQualityServiceData.push({
        quarter,
        percentage: Math.round((observed / total) * 100 * 10) / 10
      });
    }
  });
  
  // Process double glove chart (E3: 1=Yes, 2=No, 98=Don't know, 99=NA)
  Object.keys(quarterGroups).forEach(quarter => {
    const records = quarterGroups[quarter];
    let yes = 0, no = 0, dk = 0, na = 0;
    let total = 0;
    
    records.forEach(record => {
      if (record.E3 != null) {
        total++;
        if (record.E3 == 1) yes++;
        else if (record.E3 == 2) no++;
        else if (record.E3 == 98) dk++;
        else if (record.E3 == 99) na++;
      }
    });
    
    if (total > 0) {
      doubleGloveData.push({
        quarter,
        yes: Math.round((yes / total) * 100 * 10) / 10,
        no: Math.round((no / total) * 100 * 10) / 10,
        dontKnow: Math.round((dk / total) * 100 * 10) / 10,
        na: Math.round((na / total) * 100 * 10) / 10
      });
    }
  });
  
  // Process draw blood chart (E4: 1=Very worried, 2=Little worried, 3=Not worried, 4=No need)
  Object.keys(quarterGroups).forEach(quarter => {
    const records = quarterGroups[quarter];
    let veryWorried = 0, littleWorried = 0, notWorried = 0, noNeed = 0;
    let total = 0;
    
    records.forEach(record => {
      if (record.E4 != null) {
        total++;
        if (record.E4 == 1) veryWorried++;
        else if (record.E4 == 2) littleWorried++;
        else if (record.E4 == 3) notWorried++;
        else if (record.E4 == 4) noNeed++;
      }
    });
    
    if (total > 0) {
      drawBloodData.push({
        quarter,
        veryWorried: Math.round((veryWorried / total) * 100 * 10) / 10,
        littleWorried: Math.round((littleWorried / total) * 100 * 10) / 10,
        notWorried: Math.round((notWorried / total) * 100 * 10) / 10,
        noNeed: Math.round((noNeed / total) * 100 * 10) / 10
      });
    }
  });
  
  // Process enough equipment chart (E5: 1=Strongly agree, 2=Disagree, 3=Strongly disagree)
  Object.keys(quarterGroups).forEach(quarter => {
    const records = quarterGroups[quarter];
    let stronglyAgree = 0, disagree = 0, stronglyDisagree = 0;
    let total = 0;
    
    records.forEach(record => {
      if (record.E5 != null) {
        total++;
        if (record.E5 == 1) stronglyAgree++;
        else if (record.E5 == 2) disagree++;
        else if (record.E5 == 3) stronglyDisagree++;
      }
    });
    
    if (total > 0) {
      enoughEquipmentData.push({
        quarter,
        stronglyAgree: Math.round((stronglyAgree / total) * 100 * 10) / 10,
        disagree: Math.round((disagree / total) * 100 * 10) / 10,
        stronglyDisagree: Math.round((stronglyDisagree / total) * 100 * 10) / 10
      });
    }
  });
  
  // Process service quality chart (E6: 1=Very low, 2=Low, 3=Average, 4=High, 5=Very high)
  Object.keys(quarterGroups).forEach(quarter => {
    const records = quarterGroups[quarter];
    let veryLow = 0, low = 0, average = 0, high = 0, veryHigh = 0;
    let total = 0;
    
    records.forEach(record => {
      if (record.E6 != null) {
        total++;
        if (record.E6 == 1) veryLow++;
        else if (record.E6 == 2) low++;
        else if (record.E6 == 3) average++;
        else if (record.E6 == 4) high++;
        else if (record.E6 == 5) veryHigh++;
      }
    });
    
    if (total > 0) {
      serviceQualityData.push({
        quarter,
        veryLow: Math.round((veryLow / total) * 100 * 10) / 10,
        low: Math.round((low / total) * 100 * 10) / 10,
        average: Math.round((average / total) * 100 * 10) / 10,
        high: Math.round((high / total) * 100 * 10) / 10,
        veryHigh: Math.round((veryHigh / total) * 100 * 10) / 10
      });
    }
  });
  
  return {
    participationChart: participationData,
    deptChart: deptData,
    observedUnwillingServiceChart: observedUnwillingServiceData,
    observedLowQualityServiceChart: observedLowQualityServiceData,
    doubleGloveChart: doubleGloveData,
    drawBloodChart: drawBloodData,
    enoughEquipmentChart: enoughEquipmentData,
    serviceQualityChart: serviceQualityData
  };
}

// Get HFS dashboard data with charts
export const getHFSDashboard = async (req, res) => {
  try {
    const { period, periods, sites, provinces, isFiscalYear, locale } = req.method === 'GET' ? req.query : req.body;
    const userId = req.user?.id;
    const userLocale = locale || 'en';
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Get user's roleId from database if not in token
    let roleId = req.user?.roleId;
    if (!roleId) {
      const [roleResults] = await sequelize.query(
        `SELECT r.id 
         FROM roles r
         INNER JOIN model_has_roles mhr ON r.id = mhr.role_id
         WHERE mhr.model_id = ? AND mhr.model_type = 'App\\\\User'
         ORDER BY r.id ASC
         LIMIT 1`,
        { replacements: [userId] }
      );
      roleId = roleResults.length > 0 ? roleResults[0].id : null;
    }
    
    // Get user's accessible sites
    let userSites = [];
    try {
      userSites = await getUserSites(userId, roleId, userLocale);
    } catch (error) {
      console.error('Error getting user sites:', error);
      userSites = [];
    }
    
    // Handle multiple periods - support both 'period' (single/comma-separated) and 'periods' (array)
    let periodList = [];
    if (periods && Array.isArray(periods) && periods.length > 0) {
      periodList = periods;
    } else if (periods && typeof periods === 'string') {
      // Handle comma-separated string
      periodList = periods.split(',').map(p => p.trim()).filter(p => p);
    } else if (period) {
      // Handle single period or comma-separated string
      if (typeof period === 'string' && period.includes(',')) {
        periodList = period.split(',').map(p => p.trim()).filter(p => p);
      } else {
        periodList = [period];
      }
    }
    
    // If no periods, return early with empty data
    if (!periodList || periodList.length === 0) {
      return res.json({
        success: true,
        data: {
          participationChart: [],
          deptChart: {},
          observedUnwillingServiceChart: [],
          observedLowQualityServiceChart: [],
          doubleGloveChart: [],
          drawBloodChart: [],
          enoughEquipmentChart: [],
          serviceQualityChart: []
        },
        sites: userSites,
        provinces: await getProvinces(userLocale),
        userProvinces: await getUserProvinces(userId, roleId, userLocale),
        periods: getListPeriodReport()
      });
    }
    
    // Determine filter sites
    let filterSites = userSites;
    if (sites && Array.isArray(sites) && sites.length > 0) {
      if (!sites.includes('*')) {
        filterSites = sites.filter(s => userSites.includes(s));
      } else {
        filterSites = userSites;
      }
    }
    
    // Get report months for all selected periods
    let reportMonths = [];
    const allReportMonths = new Set(); // Use Set to avoid duplicates
    
    try {
      for (const periodValue of periodList) {
        const months = getReportMonthsByQuarter(periodValue, isFiscalYear || false);
        if (months && months.length > 0) {
          months.forEach(month => allReportMonths.add(month));
        }
      }
      
      reportMonths = Array.from(allReportMonths);
      
      if (!reportMonths || reportMonths.length === 0) {
        return res.json({
          success: true,
          data: {
            participationChart: [],
            deptChart: {},
            observedUnwillingServiceChart: [],
            observedLowQualityServiceChart: [],
            doubleGloveChart: [],
            drawBloodChart: [],
            enoughEquipmentChart: [],
            serviceQualityChart: []
          },
          sites: userSites,
          provinces: await getProvinces(userLocale),
          userProvinces: await getUserProvinces(userId, roleId, userLocale),
          periods: getListPeriodReport()
        });
      }
    } catch (error) {
      console.error('Error parsing periods:', error);
      return res.json({
        success: true,
        data: {
          participationChart: [],
          deptChart: {},
          observedUnwillingServiceChart: [],
          observedLowQualityServiceChart: [],
          doubleGloveChart: [],
          drawBloodChart: [],
          enoughEquipmentChart: [],
          serviceQualityChart: []
        },
        sites: userSites,
        provinces: await getProvinces(userLocale),
        userProvinces: await getUserProvinces(userId, roleId, userLocale),
        periods: getListPeriodReport()
      });
    }
    
    // Build where conditions
    const whereConditions = [];
    const replacements = {};
    
    const siteField = userLocale === 'en' ? 'sitename' : 'site';
    const provinceField = userLocale === 'en' ? 'province' : 'province_kh';
    
    // Month filter - use Month column (capital M) or derive from START
    const monthDerived = `COALESCE(
      NULLIF(Month, ''), 
      NULLIF(month, ''),
      NULLIF(MONTH, ''),
      CONCAT(
        CASE MONTH(COALESCE(start, START))
          WHEN 1 THEN 'January' WHEN 2 THEN 'February' WHEN 3 THEN 'March'
          WHEN 4 THEN 'April' WHEN 5 THEN 'May' WHEN 6 THEN 'June'
          WHEN 7 THEN 'July' WHEN 8 THEN 'August' WHEN 9 THEN 'September'
          WHEN 10 THEN 'October' WHEN 11 THEN 'November' WHEN 12 THEN 'December'
        END,
        '-',
        RIGHT(YEAR(COALESCE(start, START)), 2)
      )
    )`;
    
    whereConditions.push(`${monthDerived} IN (:months)`);
    replacements.months = reportMonths;
    
    // Site filter
    // Check both site and sitename fields to match old system behavior
    if (filterSites && filterSites.length > 0) {
      whereConditions.push(`(
        COALESCE(site, SITE, sitename, SITENAME) IN (:sites) 
        OR COALESCE(sitename, SITENAME, site, SITE) IN (:sites)
      )`);
      replacements.sites = filterSites;
    }
    
    // Province filter
    if (provinces && provinces.length > 0 && provinces[0]) {
      // Map province key to actual province name
      const provinceMap = await getProvinces(userLocale);
      const provinceKey = provinces[0];
      const provinceName = provinceMap[provinceKey] || provinceKey; // Fallback to key if not found
      whereConditions.push(`${provinceField} = :province`);
      replacements.province = provinceName;
    }
    
    // Build query - use view_psf_hfs_self_assessment_v4 table
    let query = `
      SELECT *, ${monthDerived} AS month_value FROM view_psf_hfs_self_assessment_v4
      WHERE ${whereConditions.join(' AND ')}
      AND dept IS NOT NULL
    `;
    
    query += ` ORDER BY COALESCE(start, START) ASC`;
    
    let dataset = [];
    try {
      dataset = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      });
    } catch (error) {
      console.error('Error executing HFS query:', error);
      dataset = [];
    }
    
    // Process data for charts
    const chartData = processHFSChartData(dataset, reportMonths, isFiscalYear || false);
    
    const provincesList = await getProvinces(userLocale);
    const userProvinces = await getUserProvinces(userId, roleId, userLocale);
    
    res.json({
      success: true,
      data: chartData,
      sites: userSites,
      provinces: provincesList,
      userProvinces: userProvinces,
      periods: getListPeriodReport()
    });
  } catch (error) {
    console.error('Get HFS dashboard error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error', 
      details: error.message 
    });
  }
};

export const getHFSTable = async (req, res) => {
  try {
    // Similar behaviour to getReportingTable but for HFS provider data
    // Support both GET and POST
    const { startdate, enddate, sites } = req.method === 'GET' ? req.query : req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    
    // Get user's roleId from database if not in token
    let roleId = req.user?.roleId;
    if (!roleId) {
      const [roleResults] = await sequelize.query(
        `SELECT r.id 
         FROM roles r
         INNER JOIN model_has_roles mhr ON r.id = mhr.role_id
         WHERE mhr.model_id = ? AND mhr.model_type = 'App\\\\User'
         ORDER BY r.id ASC
         LIMIT 1`,
        { replacements: [userId] }
      );
      roleId = roleResults.length > 0 ? roleResults[0].id : null;
    }
    const locale = (req.method === 'GET' ? req.query.locale : req.body.locale) || 'en';
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    
    // Get user's accessible sites
    let userSites = [];
    try {
      userSites = await getUserSites(userId, roleId, locale);
    } catch (error) {
      console.error('Error getting user sites (HFS):', error);
      userSites = [];
    }
    
    if (!startdate || !enddate) {
      return res.json({
        success: true,
        data: [],
        sites: userSites
      });
    }
    
    // Normalize dates to include full day range
    let normalizedStartDate = startdate;
    let normalizedEndDate = enddate;
    
    if (enddate && !enddate.includes(' ') && !enddate.includes('T')) {
      normalizedEndDate = `${enddate} 23:59:59`;
    }
    if (startdate && !startdate.includes(' ') && !startdate.includes('T')) {
      normalizedStartDate = `${startdate} 00:00:00`;
    }
    
    // Determine which sites to filter - match old system behavior exactly
    // Old system: when "*" selected, uses $sites which contains actual database site names
    // Old system: HFS::whereBetween('start',[$startdate,$enddate])->wherein('site',$filtersites)->get()
    // The view uses 'site' column (Khmer name), so we need actual site names from database
    
    // Get actual database site names (not locale-specific display names)
    let filterSites = [];
    if (sites && Array.isArray(sites) && sites.length > 0) {
      if (sites.includes('*')) {
        // If '*' is selected, get all user's assigned sites from database (actual site column values)
        if (roleId === 1) {
          // Admin gets all sites
          const allSitesResults = await sequelize.query(
            `SELECT DISTINCT site FROM tbl_sites WHERE site IS NOT NULL`,
            { type: QueryTypes.SELECT }
          );
          filterSites = allSitesResults.map(r => r.site);
        } else {
          // Get user's assigned sites (actual site column values)
          const userSitesResults = await sequelize.query(
            `SELECT DISTINCT s.site 
             FROM tbl_sites s
             INNER JOIN user_belong2_sites ubs ON s.id = ubs.site_id
             WHERE ubs.model_id = :userId AND ubs.model_type = 'App\\\\User'
             AND s.site IS NOT NULL`,
            {
              replacements: { userId },
              type: QueryTypes.SELECT
            }
          );
          filterSites = userSitesResults.map(r => r.site);
          
          // Check if user has "*" permission
          if (filterSites.includes('*')) {
            const allSitesResults = await sequelize.query(
              `SELECT DISTINCT site FROM tbl_sites WHERE site IS NOT NULL`,
              { type: QueryTypes.SELECT }
            );
            filterSites = allSitesResults.map(r => r.site);
          }
        }
      } else {
        // Specific sites selected - get actual database site names
        // Match requested sites against userSites to validate access, then get actual site names
        const requestedSites = sites.filter(s => {
          const siteStr = String(s).trim().toLowerCase();
          return userSites.some(us => String(us).trim().toLowerCase() === siteStr);
        });
        
        if (requestedSites.length > 0) {
          // Get actual site column values for the requested sites
          const siteField = locale === 'en' ? 'sitename' : 'site';
          const siteMappingResults = await sequelize.query(
            `SELECT DISTINCT site FROM tbl_sites 
             WHERE ${siteField} IN (:requestedSites)`,
            {
              replacements: { requestedSites },
              type: QueryTypes.SELECT
            }
          );
          filterSites = siteMappingResults.map(r => r.site);
        }
      }
    } else {
      // No sites specified - get all user's assigned sites (actual site column values)
      if (roleId === 1) {
        const allSitesResults = await sequelize.query(
          `SELECT DISTINCT site FROM tbl_sites WHERE site IS NOT NULL`,
          { type: QueryTypes.SELECT }
        );
        filterSites = allSitesResults.map(r => r.site);
      } else {
        const userSitesResults = await sequelize.query(
          `SELECT DISTINCT s.site 
           FROM tbl_sites s
           INNER JOIN user_belong2_sites ubs ON s.id = ubs.site_id
           WHERE ubs.model_id = :userId AND ubs.model_type = 'App\\\\User'
           AND s.site IS NOT NULL`,
          {
            replacements: { userId },
            type: QueryTypes.SELECT
          }
        );
        filterSites = userSitesResults.map(r => r.site);
      }
    }
    
    // Build query to get HFS data - match old system behavior exactly
    // Old system queries view_psf_hfs_self_assessment_v4 directly
    // Try simple query first, then add ACKNOWLEDGE from providerdata if needed
    let query = `
      SELECT * FROM view_psf_hfs_self_assessment_v4
      WHERE (COALESCE(start, START) BETWEEN :startdate AND :enddate)
    `;
    
    const replacements = { startdate: normalizedStartDate, enddate: normalizedEndDate };
    
    if (filterSites.length > 0) {
      // Old system uses simple wherein('site',$filtersites) - filters by 'site' column only
      query += ` AND COALESCE(site, SITE, '') IN (:sites)`;
      replacements.sites = filterSites.map(s => String(s).trim()).filter(s => s.length > 0);
    }
    
    query += ` ORDER BY COALESCE(START, start) ASC`;
    
    let data = [];
    try {
      data = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      });
      
      if (data.length > 0) {
        const withAcknowledge = data.filter(r => {
          const ack = r.ACKNOWLEDGE !== undefined && r.ACKNOWLEDGE !== null;
          return ack;
        }).length;
        
        if (withAcknowledge < data.length * 0.5) {
          const uris = data.map(r => r._URI || r._uri).filter(Boolean);
          
          if (uris.length > 0) {
            const acknowledgeQuery = `
              SELECT _URI, ACKNOWLEDGE, acknowledge, Acknowledge
              FROM providerdata
              WHERE _URI IN (:uris)
            `;
            const acknowledgeData = await sequelize.query(acknowledgeQuery, {
              replacements: { uris },
              type: QueryTypes.SELECT
            });
            
            // Create a map of URI to ACKNOWLEDGE
            const acknowledgeMap = {};
            acknowledgeData.forEach(row => {
              const uri = row._URI || row._uri;
              const acknowledge = row.ACKNOWLEDGE !== undefined ? row.ACKNOWLEDGE : 
                                 (row.acknowledge !== undefined ? row.acknowledge : 
                                 (row.Acknowledge !== undefined ? row.Acknowledge : null));
              acknowledgeMap[uri] = acknowledge;
            });
            
            // Update ACKNOWLEDGE in data (only if it was null/undefined)
            data = data.map(row => {
              const uri = row._URI || row._uri;
              const currentAck = row.ACKNOWLEDGE;
              // Only update if current ACKNOWLEDGE is null/undefined and we have a value from providerdata
              if ((currentAck === null || currentAck === undefined) && acknowledgeMap[uri] !== undefined) {
                return {
                  ...row,
                  ACKNOWLEDGE: acknowledgeMap[uri]
                };
              }
              return row;
            });
          }
        }
      }
    } catch (error) {
      console.error('HFS table query error:', error);
      console.error('Query:', query);
      console.error('Replacements:', replacements);
      data = [];
    }

    res.json({ 
      success: true,
      message: 'HFS table data',
      data,
      total: data.length,
      sites: userSites
    });
  } catch (error) {
    console.error('Get HFS table error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAdminDashboard = async (req, res) => {
  try {
    res.json({ 
      success: true,
      message: 'Admin dashboard data',
      data: {}
    });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
