import { Router } from 'express';
import multer from 'multer';
import { authenticate, optionalAuthenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  regenerateField,
  syncSocial,
  listSocialSyncs,
  deleteSocialSource,
} from './candidate-social.controller';
import {
  upsertProfile,
  getProfile,
  uploadAndParseResume,
  redirectToMyResume,
} from './candidate-profile.controller';

export const candidateProfileRouter = Router();

const upload = multer({
  limits: {
    fileSize: 15 * 1024 * 1024,
    fieldSize: 30 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = (file.originalname || '').toLowerCase();
    const isAllowedExt =
      ext.endsWith('.pdf') ||
      ext.endsWith('.docx') ||
      ext.endsWith('.doc') ||
      ext.endsWith('.txt') ||
      ext.endsWith('.png') ||
      ext.endsWith('.jpg') ||
      ext.endsWith('.jpeg') ||
      ext.endsWith('.webp');
    const isAllowedMime =
      (file.mimetype || '').includes('pdf') ||
      file.mimetype.includes('document') ||
      file.mimetype.includes('text') ||
      file.mimetype.includes('image') ||
      file.mimetype.includes('stream');

    if (isAllowedExt || isAllowedMime || !file.mimetype) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

candidateProfileRouter.post('/regenerate-field', optionalAuthenticate, regenerateField);
candidateProfileRouter.post('/sync-social', authenticate, requireRole('candidate'), syncSocial);
candidateProfileRouter.get('/social/syncs', authenticate, requireRole('candidate'), listSocialSyncs);
candidateProfileRouter.delete('/social/:source', authenticate, requireRole('candidate'), deleteSocialSource);
candidateProfileRouter.post('/profile', authenticate, requireRole('candidate'), upload.single('resume'), upsertProfile);
candidateProfileRouter.post('/profile/parse-resume', authenticate, requireRole('candidate'), upload.single('resume'), uploadAndParseResume);
candidateProfileRouter.get('/profile', authenticate, requireRole('candidate'), getProfile);
candidateProfileRouter.get('/profile/resume', authenticate, requireRole('candidate'), redirectToMyResume);

