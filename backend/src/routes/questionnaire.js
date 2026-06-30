import express from 'express';
import {
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

