import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the latest APK file
router.get('/apk', (req, res) => {
  try {
    const downloadsDir = path.join(__dirname, '../../public/downloads');
    
    // Check if downloads directory exists
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
      return res.status(404).json({ error: 'APK file not found. Please upload an APK file first.' });
    }

    // Find APK files in the directory
    const files = fs.readdirSync(downloadsDir);
    const apkFiles = files.filter(file => file.toLowerCase().endsWith('.apk'));

    if (apkFiles.length === 0) {
      return res.status(404).json({ error: 'No APK file found. Please upload an APK file first.' });
    }

    // Get the most recent APK file (by modification time)
    const apkFilesWithStats = apkFiles.map(file => {
      const filePath = path.join(downloadsDir, file);
      const stats = fs.statSync(filePath);
      return { file, path: filePath, mtime: stats.mtime };
    });

    // Sort by modification time (newest first)
    apkFilesWithStats.sort((a, b) => b.mtime - a.mtime);
    const latestApk = apkFilesWithStats[0];

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${latestApk.file}"`);
    res.setHeader('Content-Length', fs.statSync(latestApk.path).size);

    // Stream the file
    const fileStream = fs.createReadStream(latestApk.path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving APK file:', error);
    res.status(500).json({ error: 'Failed to serve APK file' });
  }
});

// Get APK file info (without downloading)
router.get('/apk/info', (req, res) => {
  try {
    const downloadsDir = path.join(__dirname, '../../public/downloads');
    
    if (!fs.existsSync(downloadsDir)) {
      return res.json({ available: false, message: 'No APK file available' });
    }

    const files = fs.readdirSync(downloadsDir);
    const apkFiles = files.filter(file => file.toLowerCase().endsWith('.apk'));

    if (apkFiles.length === 0) {
      return res.json({ available: false, message: 'No APK file available' });
    }

    // Get the most recent APK file
    const apkFilesWithStats = apkFiles.map(file => {
      const filePath = path.join(downloadsDir, file);
      const stats = fs.statSync(filePath);
      return { 
        filename: file, 
        size: stats.size,
        modified: stats.mtime,
        url: `/api/downloads/apk`
      };
    });

    apkFilesWithStats.sort((a, b) => b.modified - a.modified);
    const latestApk = apkFilesWithStats[0];

    res.json({
      available: true,
      filename: latestApk.filename,
      size: latestApk.size,
      sizeFormatted: formatFileSize(latestApk.size),
      modified: latestApk.modified,
      url: latestApk.url
    });
  } catch (error) {
    console.error('Error getting APK info:', error);
    res.status(500).json({ error: 'Failed to get APK info' });
  }
});

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export default router;
