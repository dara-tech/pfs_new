import express from 'express';
import { getLogo, getAppIcon } from '../controllers/adminController.js';

const router = express.Router();

// Public routes - no authentication required (needed for login page and mobile app)
router.get('/logo', getLogo);
router.get('/app-icon', getAppIcon);

export default router;
