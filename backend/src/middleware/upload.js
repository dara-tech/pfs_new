import multer from 'multer';

// Configure multer for memory storage (we'll upload directly to Cloudinary)
const storage = multer.memoryStorage();

// File filter for audio files only
const audioFileFilter = (req, file, cb) => {
  // Accept audio files
  if (file.mimetype.startsWith('audio/') || 
      file.mimetype === 'audio/mpeg' || 
      file.mimetype === 'audio/mp3' ||
      file.mimetype === 'audio/wav' ||
      file.mimetype === 'audio/ogg' ||
      file.mimetype === 'audio/webm') {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed'), false);
  }
};

// File filter for image files only
const imageFileFilter = (req, file, cb) => {
  // Accept image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// Configure multer for audio
export const uploadAudio = multer({
  storage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Configure multer for images
export const uploadImage = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// File filter for APK files only
const apkFileFilter = (req, file, cb) => {
  // Accept APK files
  if (file.mimetype === 'application/vnd.android.package-archive' || 
      file.originalname.toLowerCase().endsWith('.apk')) {
    cb(null, true);
  } else {
    cb(new Error('Only APK files are allowed'), false);
  }
};

// Configure multer for APK files
export const uploadApk = multer({
  storage,
  fileFilter: apkFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for APK files
  }
});
