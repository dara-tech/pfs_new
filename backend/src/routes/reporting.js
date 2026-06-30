import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { cacheReporting } from '../middleware/cacheReporting.js';
import {
  getDashboard,
  getReportingTable,
  getHFSDashboard,
  getHFSTable,
  getAdminDashboard
} from '../controllers/reportingController.js';

const router = express.Router();

const cacheDashboard = cacheReporting({ ttlSeconds: Number(process.env.REPORTING_CACHE_DASHBOARD_TTL || 60) });
const cacheTable = cacheReporting({ ttlSeconds: Number(process.env.REPORTING_CACHE_TABLE_TTL || 120) });

router.use(authenticate);

router.get('/dashboard', cacheDashboard, getDashboard);
router.post('/dashboard', cacheDashboard, getDashboard);
router.get('/table', cacheTable, getReportingTable);
router.post('/table', cacheTable, getReportingTable);
router.get('/hfs/dashboard', cacheDashboard, getHFSDashboard);
router.post('/hfs/dashboard', cacheDashboard, getHFSDashboard);
router.get('/hfs/table', cacheTable, getHFSTable);
router.post('/hfs/table', cacheTable, getHFSTable);
router.get('/admin/dashboard', cacheDashboard, getAdminDashboard);
router.post('/admin/dashboard', cacheDashboard, getAdminDashboard);

export default router;

