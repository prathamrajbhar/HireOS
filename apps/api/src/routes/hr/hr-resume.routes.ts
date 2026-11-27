import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { requireOrgScope, rejectOrgIdParam } from '../../middleware/orgScope';
import { getPresignedUrl } from '../../lib/storage';

export const hrResumeRouter = Router();

hrResumeRouter.use(rejectOrgIdParam);

/** Redirects HR to a short-lived presigned S3 URL for the candidate's uploaded resume (org-scoped). */
hrResumeRouter.get(
  '/applications/:id/resume',
  authenticate,
  requireRole('hr'),
  requireOrgScope,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const application = await prisma.application.findFirst({
        where: { id: req.params.id as string, job: { org_id: req.user!.orgId! } },
        select: { candidate: { select: { resume_url: true } } },
      });
      const resumeUrl = application?.candidate?.resume_url;
      if (!resumeUrl) {
        return res.status(404).json({ success: false, error: 'No resume uploaded' });
      }
      return res.redirect(await getPresignedUrl(resumeUrl, 300));
    } catch (error) {
      return next(error);
    }
  }
);
