import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission,
  getSites,
  createSite,
  updateSite,
  deleteSite,
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  uploadQuestionAudio,
  getLogo,
  updateLogo,
  resetLogo,
  getAppIcon,
  updateAppIcon,
  resetAppIcon,
  getDevices,
  createDevice,
  updateDevice,
  deleteDevice,
  uploadApk,
  getApkInfo,
  deleteApk
} from '../controllers/adminController.js';
import { backupData, restoreData, verifyRestore, upload as backupUpload } from '../controllers/backupController.js';
import { uploadAudio, uploadImage, uploadApk as uploadApkMiddleware } from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Users routes
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/reset-password', resetPassword);

// Roles routes
router.get('/roles', getRoles);
router.post('/roles', createRole);
router.put('/roles/:id', updateRole);
router.delete('/roles/:id', deleteRole);

// Permissions routes
router.get('/permissions', getPermissions);
router.post('/permissions', createPermission);
router.put('/permissions/:id', updatePermission);
router.delete('/permissions/:id', deletePermission);

// Sites routes
router.get('/sites', getSites);
router.post('/sites', createSite);
router.put('/sites/:id', updateSite);
router.delete('/sites/:id', deleteSite);

// Questions routes
router.get('/questions', getQuestions);
router.post('/questions', createQuestion);
router.put('/questions/:id', updateQuestion);
router.delete('/questions/:id', deleteQuestion);
router.post('/questions/upload-audio', uploadAudio.single('audio'), uploadQuestionAudio);

// Backup and Restore routes
router.get('/backup', backupData);
router.post('/restore/verify', backupUpload.single('file'), verifyRestore);
router.post('/restore', backupUpload.single('file'), restoreData);

// Settings routes
router.get('/settings/logo', getLogo);
router.post('/settings/logo', uploadImage.single('logo'), updateLogo);
router.delete('/settings/logo', resetLogo);
router.get('/settings/app-icon', getAppIcon);
router.post('/settings/app-icon', uploadImage.single('icon'), updateAppIcon);
router.delete('/settings/app-icon', resetAppIcon);

// Devices routes
router.get('/devices', getDevices);
router.post('/devices', createDevice);
router.put('/devices/:id', updateDevice);
router.delete('/devices/:id', deleteDevice);

// APK Management routes
router.get('/apk', getApkInfo);
router.post('/apk', uploadApkMiddleware.single('apk'), uploadApk);
router.delete('/apk/:filename', deleteApk);

export default router;

