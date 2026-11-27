import { Request, Response, NextFunction } from 'express';
import { getOrgAnalytics } from '../../services/hr/analytics.service';

export async function getAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.orgId;
    if (!orgId) {
      return res.status(400).json({ success: false, error: 'User does not belong to an organization' });
    }

    const data = await getOrgAnalytics(orgId);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}
