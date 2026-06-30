# Integration Plan: Combining Old Laravel App with New Express + React App

## Overview

This document outlines how to integrate the old Laravel questionnaire system (`pfs_new/psf`) with the new Express + React application (`pfs_new/backend` + `pfs_new/frontend`).

## Current Architecture

### Old App (Laravel - `pfs_new/psf`)
- **Framework**: Laravel 7
- **Frontend**: Blade templates
- **Features**:
  - Client questionnaire (multiple sections: consent, section1a, section1a1, section1b, section1c, section5c, section6c)
  - Provider questionnaire (consent, section1)
  - Token-based access control
  - Multi-language support (en/kh)
  - UserData and ProviderData models

### New App (Express + React)
- **Backend**: Express.js + Sequelize
- **Frontend**: React + Vite + shadcn/ui
- **Features**:
  - JWT authentication
  - Reporting dashboard
  - Admin panel
  - Modern UI components

## Integration Strategy

### Option 1: Full Migration (Recommended)
Migrate all questionnaire functionality to Express + React API and frontend.

### Option 2: Hybrid Approach
Keep Laravel app running for questionnaires, integrate via API proxy.

### Option 3: Gradual Migration
Migrate one feature at a time while keeping both systems running.

---

## Recommended: Option 1 - Full Migration

### Phase 1: Database Models Migration

#### 1.1 Create Sequelize Models

Create models in `pfs_new/backend/src/models/`:

**UserData.js**
```javascript
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const UserData = sequelize.define('UserData', {
  _URI: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  ACKNOWLEDGE: DataTypes.INTEGER,
  Q1A: DataTypes.STRING,
  Q2A: DataTypes.STRING,
  // ... all other fields
  START: DataTypes.DATE,
  USERNAME: DataTypes.STRING,
  DEVICEID: DataTypes.STRING,
  _IS_COMPLETE: DataTypes.INTEGER,
  _SUBMISSION_DATE: DataTypes.DATE
}, {
  tableName: 'userdata',
  timestamps: false
});
```

**ProviderData.js**
```javascript
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ProviderData = sequelize.define('ProviderData', {
  _URI: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  ACKNOWLEDGE: DataTypes.INTEGER,
  dept: DataTypes.STRING,
  e1: DataTypes.STRING,
  // ... all other fields
  START: DataTypes.DATE,
  USERNAME: DataTypes.STRING,
  DEVICEID: DataTypes.STRING,
  _IS_COMPLETE: DataTypes.INTEGER,
  _SUBMISSION_DATE: DataTypes.DATE
}, {
  tableName: 'providerdata',
  timestamps: false
});
```

**Token.js**
```javascript
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Token = sequelize.define('Token', {
  code: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  username: DataTypes.STRING,
  site_en: DataTypes.STRING,
  site_kh: DataTypes.STRING
}, {
  tableName: 'tokens',
  timestamps: false
});
```

**Site.js**
```javascript
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Site = sequelize.define('Site', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: DataTypes.STRING,
  sitecode: DataTypes.STRING,
  province: DataTypes.STRING,
  sitename: DataTypes.STRING,
  site: DataTypes.STRING,
  province_kh: DataTypes.STRING
}, {
  tableName: 'tbl_sites',
  timestamps: false
});
```

### Phase 2: API Endpoints Migration

#### 2.1 Create Questionnaire Routes

**`pfs_new/backend/src/routes/questionnaire.js`**
```javascript
import express from 'express';
import {
  verifyToken,
  getClientPage,
  saveClientPage,
  getProviderPage,
  saveProviderPage,
  getTokenInfo,
  getAllTokens,
  getAllSites
} from '../controllers/questionnaireController.js';

const router = express.Router();

// Client routes
router.get('/client/:token/:locale?', getClientPage);
router.post('/client/:token/:index', saveClientPage);
router.get('/client/:token/:locale/:uuid/:index', getClientPage);

// Provider routes
router.get('/provider/:token/:locale?', getProviderPage);
router.post('/provider/:token/:index', saveProviderPage);
router.get('/provider/:token/:locale/:uuid/:index', getProviderPage);

// Token and site info
router.get('/tokens', getAllTokens);
router.get('/sites', getAllSites);
router.get('/token/:token', getTokenInfo);

export default router;
```

#### 2.2 Create Questionnaire Controller

**`pfs_new/backend/src/controllers/questionnaireController.js`**
```javascript
import { v4 as uuidv4 } from 'uuid';
import { UserData, ProviderData, Token, Site } from '../models/index.js';

// Verify token helper
export const verifyToken = async (token) => {
  if (!token) return false;
  const dbToken = await Token.findByPk(token);
  return dbToken !== null;
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
};

// Client questionnaire - Get page
export const getClientPage = async (req, res) => {
  try {
    const { token, locale = 'kh', uuid, index } = req.params;
    
    if (!await verifyToken(token)) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    const tokenInfo = await Token.findByPk(token);
    const site = locale === 'en' ? tokenInfo.site_en : tokenInfo.site_kh;

    if (index === 'index') {
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
        locale
      });
    }

    if (!index) {
      // Initial page - generate UUID
      const newUuid = uuidv4();
      return res.json({
        page: 'client',
        token,
        locale,
        parent: 'client',
        uuid: newUuid,
        site
      });
    }

    // Return page data based on index
    res.json({
      page: index,
      token,
      locale,
      parent: 'client',
      uuid,
      site
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
};

// Save consent
const saveConsent = async (req, res, token, tokenInfo, locale, _uri, formData) => {
  let userData = await UserData.findByPk(_uri);
  
  if (!userData) {
    userData = UserData.build({ _URI: _uri });
  }

  userData.ACKNOWLEDGE = formData.consent;
  userData.START = new Date();
  userData.USERNAME = tokenInfo.username;
  userData.DEVICEID = req.headers['user-agent']?.substring(0, 255) || '';
  
  await userData.save();

  if (userData.ACKNOWLEDGE === 1) {
    return res.json({
      redirect: `/client/${token}/${locale}/${_uri}/section1`
    });
  } else {
    return res.json({
      redirect: `/client/${token}/${locale}/${_uri}/thank`
    });
  }
};

// Save section 1a
const saveSection1a = async (req, res, token, locale, _uri, formData) => {
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

  res.json({
    redirect: `/client/${token}/${locale}/${_uri}/section1a1`
  });
};

// Similar functions for other sections...
// (section1a1, section1b, section1c, section5c, section6c)

// Provider questionnaire functions...
export const getProviderPage = async (req, res) => {
  // Similar to getClientPage but for provider
};

export const saveProviderPage = async (req, res) => {
  // Similar to saveClientPage but for provider
};
```

### Phase 3: React Frontend Migration

#### 3.1 Create Questionnaire Pages

**`pfs_new/frontend/src/pages/ClientQuestionnaire.jsx`**
```javascript
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export default function ClientQuestionnaire() {
  const { token, locale = 'kh', uuid, index } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [pageData, setPageData] = useState(null);

  useEffect(() => {
    loadPage();
  }, [token, locale, uuid, index]);

  const loadPage = async () => {
    try {
      const url = uuid && index 
        ? `/api/questionnaire/client/${token}/${locale}/${uuid}/${index}`
        : `/api/questionnaire/client/${token}/${locale}`;
      
      const response = await api.get(url);
      setPageData(response.data);
      
      if (response.data.uuid && !uuid) {
        navigate(`/client/${token}/${locale}/${response.data.uuid}/consent`);
      }
    } catch (error) {
      console.error('Error loading page:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post(
        `/api/questionnaire/client/${token}/${index}`,
        { ...formData, locale, _uri: uuid }
      );
      
      if (response.data.redirect) {
        navigate(response.data.redirect);
      }
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  // Render form based on index
  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Questionnaire - {index}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          {/* Form fields based on section */}
          <Button type="submit">Save & Continue</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

#### 3.2 Update Routes

**`pfs_new/frontend/src/App.jsx`** (add routes)
```javascript
import ClientQuestionnaire from './pages/ClientQuestionnaire';
import ProviderQuestionnaire from './pages/ProviderQuestionnaire';

// Add to routes:
<Route path="/client/:token/:locale?" element={<ClientQuestionnaire />} />
<Route path="/client/:token/:locale/:uuid/:index" element={<ClientQuestionnaire />} />
<Route path="/provider/:token/:locale?" element={<ProviderQuestionnaire />} />
<Route path="/provider/:token/:locale/:uuid/:index" element={<ProviderQuestionnaire />} />
```

### Phase 4: Fix Issues from Old Code

Before migration, fix all issues identified in `ISSUES_REPORT.md`:

1. ✅ Fix field name mismatches (Q4C, Q3c_1, etc.)
2. ✅ Fix missing break statements
3. ✅ Fix property assignment bugs
4. ✅ Add proper error handling
5. ✅ Add validation

### Phase 5: Testing & Deployment

1. Test all questionnaire flows
2. Test token verification
3. Test multi-language support
4. Test data persistence
5. Deploy to production

---

## Alternative: Option 2 - Hybrid Approach

If you want to keep Laravel running temporarily:

### Setup API Proxy

**`pfs_new/backend/src/routes/proxy.js`**
```javascript
import express from 'express';
import axios from 'axios';

const router = express.Router();
const LARAVEL_URL = process.env.LARAVEL_URL || 'http://localhost:8000';

router.all('/questionnaire/*', async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: `${LARAVEL_URL}${req.path}`,
      data: req.body,
      headers: req.headers
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

export default router;
```

---

## Migration Checklist

### Database
- [ ] Verify all tables exist (userdata, providerdata, tokens, tbl_sites)
- [ ] Test database connections
- [ ] Create Sequelize models
- [ ] Test model queries

### Backend
- [ ] Create questionnaire routes
- [ ] Create questionnaire controller
- [ ] Implement token verification
- [ ] Implement all save methods
- [ ] Add validation
- [ ] Add error handling
- [ ] Test all endpoints

### Frontend
- [ ] Create ClientQuestionnaire component
- [ ] Create ProviderQuestionnaire component
- [ ] Create form components for each section
- [ ] Add routing
- [ ] Add multi-language support
- [ ] Test all flows

### Integration
- [ ] Test complete client flow
- [ ] Test complete provider flow
- [ ] Test token validation
- [ ] Test data persistence
- [ ] Test error scenarios

### Deployment
- [ ] Update environment variables
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Test in production
- [ ] Monitor for errors

---

## Next Steps

1. **Review this plan** and choose integration approach
2. **Fix issues** in old Laravel code first (see ISSUES_REPORT.md)
3. **Start with Phase 1** - Create Sequelize models
4. **Test models** with existing data
5. **Proceed with API migration** (Phase 2)
6. **Build React components** (Phase 3)
7. **Test thoroughly** before deployment

---

## Questions to Consider

1. Do you want to keep the old Laravel app running during migration?
2. Should we maintain backward compatibility with existing tokens?
3. Do you need to migrate existing data or start fresh?
4. What's the timeline for this migration?
5. Do you need to support both systems simultaneously?

