import express from 'express';
import { speak } from '../controllers/ttsController.js';

const router = express.Router();

// TTS endpoint - no authentication required for public questionnaire
router.post('/speak', speak);

export default router;
