import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize } from './config/database.js';
import { initRedis } from './config/redis.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import reportingRoutes from './routes/reporting.js';
import apiRoutes from './routes/api.js';
import questionnaireRoutes from './routes/questionnaire.js';
import ttsRoutes from './routes/tts.js';
import settingsRoutes from './routes/settings.js';
import downloadsRoutes from './routes/downloads.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Configure Helmet for API server (less restrictive for mobile apps)
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API endpoints
  crossOriginEmbedderPolicy: false, // Allow cross-origin requests
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow cross-origin resources
}));
app.use(morgan('dev'));

// CORS — reflect allowed Origin (required for credentials). Never throw (avoids HTTP 500).
function isCorsOriginAllowed(origin) {
  if (!origin) return true;

  const extra = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://107.175.91.211',
    'http://107.175.91.211:80',
    'http://107.175.91.211:3000',
    'https://107.175.91.211',
    'https://107.175.91.211:443',
    'https://psfnew.nchads.gov.kh',
    'http://psfnew.nchads.gov.kh',
    'https://api.psfnew.nchads.gov.kh',
    'http://api.psfnew.nchads.gov.kh',
    'https://psf-flax.vercel.app',
    'http://192.168.1.116:3000',
    'http://192.168.0.102:3000',
    'http://10.0.2.2:3000',
    ...extra,
  ];

  if (allowedOrigins.includes(origin)) return true;

  const patterns = [
    /^https?:\/\/localhost:\d+$/,
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
    /^http:\/\/10\.0\.2\.\d+:\d+$/,
    /^https?:\/\/107\.175\.91\.211(:\d+)?$/,
    /^https?:\/\/psfnew\.nchads\.gov\.kh(:\d+)?$/,
    /^https?:\/\/api\.psfnew\.nchads\.gov\.kh(:\d+)?$/,
    /^https:\/\/[a-z0-9-]+-[a-z0-9]+-[\w-]+\.vercel\.app$/i,
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
  ];

  if (patterns.some((p) => p.test(origin))) return true;
  if (process.env.NODE_ENV === 'development') return true;
  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    if (isCorsOriginAllowed(origin)) {
      return callback(null, origin || true);
    }
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reporting', reportingRoutes);
app.use('/api/v1', apiRoutes);
app.use('/api/questionnaire', questionnaireRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/downloads', downloadsRoutes);

// Serve APK files from public directory (static files)
app.use('/downloads', express.static(path.join(__dirname, '../public/downloads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler middleware (must be after all routes)
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  console.error('❌ Error stack:', err.stack);
  console.error('❌ Request URL:', req.originalUrl);
  console.error('❌ Request method:', req.method);
  
  // Don't send response if headers already sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Default error status
  const status = err.status || err.statusCode || 500;
  
  // Send error response
  res.status(status).json({
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method
  });
});

// 404 handler (must be after all routes and error handler)
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Database connection
sequelize.authenticate()
  .then(async () => {
    console.log('✅ Database connected successfully');
    await initRedis();
    app.listen(PORT, '0.0.0.0', () => {
      const poolMax = process.env.DB_POOL_MAX || 5;
      console.log(`🚀 Server running on port ${PORT} (DB pool max: ${poolMax})`);
      console.log(`🌐 Accessible at http://localhost:${PORT} and http://192.168.1.116:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Unable to connect to database:', err);
  });

export default app;

