import { Request, Response, NextFunction } from 'express';
import { prisma, Prisma } from '@nextround/database';
import { selectCodingProblem } from '../../services/questions/question-bank.service';
import { getCandidateProfileId } from '../../lib/candidate-profile';
import { normalizeDifficulty } from './mock-aptitude.controller';
import { extractAssessmentTimer } from '../../services/assessment/assessment-timer.service';

export async function getMockCoding(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    let candidateId: string;
    try {
      candidateId = await getCandidateProfileId(req.user.userId);
    } catch {
      return res.status(404).json({ success: false, error: 'Candidate profile not found' });
    }

    if (!candidateId) {
      return res.status(404).json({ success: false, error: 'Candidate profile not found' });
    }

    const sessionId = req.params.id as string;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'Mock session ID is required' });
    }

    const session = await prisma.mockSession.findFirst({
      where: { id: sessionId, candidate_id: candidateId },
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Mock session not found' });
    }

    const rawDiff = normalizeDifficulty(session.difficulty);

    const existing = await prisma.assessment.findFirst({
      where: { session_id: session.id, test_type: 'coding' },
    });

    let problem: Record<string, unknown>;
    if (existing?.questions && typeof existing.questions === 'object') {
      problem = existing.questions as Record<string, unknown>;
    } else {
      const selected = await selectCodingProblem({
        difficulty: rawDiff,
      });
      problem = selected as unknown as Record<string, unknown>;

      await prisma.assessment.create({
        data: {
          session_id: session.id,
          test_type: 'coding',
          questions: problem as Prisma.InputJsonValue,
          status: 'in_progress',
        },
      });
    }

    const rawTestCases = Array.isArray(problem.testCases) ? problem.testCases : [];
    const sanitizedProblem = {
      ...problem,
      testCases: rawTestCases.filter((tc: Record<string, unknown>) => !tc.hidden),
    };

    const timer = existing ? extractAssessmentTimer(existing) : undefined;
    return res.json({ success: true, data: { problem: sanitizedProblem, timer } });
  } catch (error) {
    return next(error);
  }
}
