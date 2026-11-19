import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { requireOrgScope, rejectOrgIdParam } from '../../middleware/orgScope';
import {
  listJobs,
  listOrgJobs,
  getJob,
} from './jobs-query.controller';
import {
  createJob,
  updateJob,
  publishJob,
  closeJob,
  deleteJob,
} from './jobs-mutation.controller';
import { extractRequirements, aiAssistJob, generateJd, generateQuestions, uploadQuestionBank } from './jobs-ai.controller';
import { getJobPipeline, getJobApplications } from './jobs-pipeline.controller';

export const jobRouter = Router();

const questionBankUpload = multer({
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = (file.originalname || '').toLowerCase();
    const isAllowedExt = ext.endsWith('.pdf');
    const isAllowedMime = (file.mimetype || '').includes('pdf') || !file.mimetype;

    if (isAllowedExt || isAllowedMime) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are supported for question bank uploads.'));
    }
  },
});

jobRouter.use(rejectOrgIdParam);

jobRouter.post('/', authenticate, requireRole('hr'), requireOrgScope, createJob);
jobRouter.get('/', authenticate, listJobs);
jobRouter.get('/org', authenticate, requireRole('hr'), requireOrgScope, listOrgJobs);
jobRouter.get('/:id', authenticate, getJob);
jobRouter.patch('/:id', authenticate, requireRole('hr'), requireOrgScope, updateJob);
jobRouter.put('/:id', authenticate, requireRole('hr'), requireOrgScope, updateJob);
jobRouter.post('/:id/publish', authenticate, requireRole('hr'), requireOrgScope, publishJob);
jobRouter.post('/:id/close', authenticate, requireRole('hr'), requireOrgScope, closeJob);
jobRouter.delete('/:id', authenticate, requireRole('hr'), requireOrgScope, deleteJob);

jobRouter.post('/extract-requirements', authenticate, requireRole('hr'), extractRequirements);
jobRouter.post('/generate-jd', authenticate, requireRole('hr'), generateJd);
jobRouter.post('/generate-questions', authenticate, requireRole('hr'), generateQuestions);
jobRouter.post(
  '/upload-question-bank',
  authenticate,
  requireRole('hr'),
  (req: Request, res: Response, next: NextFunction) => {
    questionBankUpload.single('file')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message || 'File upload error' });
      }
      return uploadQuestionBank(req, res, next);
    });
  }
);
jobRouter.post('/:id/ai-assist', authenticate, requireRole('hr'), requireOrgScope, aiAssistJob);
jobRouter.get('/:id/pipeline', authenticate, requireRole('hr'), requireOrgScope, getJobPipeline);
jobRouter.get('/:id/applications', authenticate, requireRole('hr'), requireOrgScope, getJobApplications);

