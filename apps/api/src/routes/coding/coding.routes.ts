import { Router, Request, Response, NextFunction } from 'express';
import { selectCodingProblem } from '../../services/questions/question-bank.service';
import { enqueueSubmissionExecution } from '../../services/submission/submission-queue.service';
import { authenticate } from '../../middleware/auth';
import { CodingExecutionRequestSchema } from '@nextround/shared';
import { prisma, Prisma } from '@nextround/database';
import { executeCodingSubmission, TestCaseInput } from '../../services/coding/coding-executor.service';
import { normalizeTestCases } from '../../services/coding/test-case-normalizer';
import {
  extractAssessmentTimer,
  initializeOrResumeTimer,
  DEFAULT_CODING_DURATION_SECONDS,
} from '../../services/assessment/assessment-timer.service';
import { updateApplicationCodingScore } from '../../services/scoring/scoring.service';
import {
  verifyApplicationAccess,
  verifyMockSessionAccess,
} from '../../services/application/application-coding.service';
import { ok, fail } from '../../lib/http';
import crypto from 'crypto';
import { DEMO_SOLUTIONS, DEMO_LANGUAGES, type DemoLanguage } from '../../data/demo-solutions';

export const codingRouter = Router();

codingRouter.post('/start', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { applicationId, sessionId } = req.body;
    if (applicationId) {
      const access = await verifyApplicationAccess(applicationId, req.user!, { candidateOnly: true });
      if (!access.authorized) {
        return fail(res, access.status, access.code, access.message);
      }

      const assessment = await prisma.assessment.findFirst({
        where: { application_id: applicationId, test_type: 'coding' },
      });
      if (!assessment) {
        return fail(res, 404, 'NOT_FOUND', 'Assessment not found for application');
      }
      if (assessment.status === 'completed') {
        return fail(res, 400, 'ASSESSMENT_COMPLETED', 'Assessment is already completed and cannot be restarted.');
      }
      const { updatedQuestions, timer } = initializeOrResumeTimer(assessment);
      await prisma.assessment.update({
        where: { id: assessment.id },
        data: {
          status: 'in_progress',
          questions: updatedQuestions,
        },
      });
      return ok(res, { timer });
    }

    if (sessionId) {
      const access = await verifyMockSessionAccess(sessionId, req.user!);
      if (!access.authorized) {
        return fail(res, access.status, access.code, access.message);
      }

      const assessment = await prisma.assessment.findFirst({
        where: { session_id: access.session.id, test_type: 'coding' },
      });
      if (!assessment) {
        return fail(res, 404, 'NOT_FOUND', 'Coding assessment not found for mock session');
      }
      if (assessment.status === 'completed') {
        return fail(res, 400, 'ASSESSMENT_COMPLETED', 'Assessment is already completed and cannot be restarted.');
      }
      const { updatedQuestions, timer } = initializeOrResumeTimer(assessment);
      await prisma.assessment.update({
        where: { id: assessment.id },
        data: {
          status: 'in_progress',
          questions: updatedQuestions,
        },
      });
      return ok(res, { timer });
    }

    return fail(res, 400, 'BAD_REQUEST', 'applicationId or sessionId is required to start assessment');
  } catch (err) {
    return next(err);
  }
});

codingRouter.get('/problem', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const difficulty = (req.query.difficulty as 'easy' | 'medium' | 'hard') || undefined;
    const category   = (req.query.category as string) || undefined;

    const problem = await selectCodingProblem({ difficulty, category });

    const sanitized = {
      ...problem,
      testCases: problem.testCases.filter(tc => !tc.hidden),
    };

    return ok(res, { problem: sanitized });
  } catch (err) {
    return next(err);
  }
});

/**
 * @deprecated Legacy queued submission endpoint (Application assessments only).
 * Mock practice assessments are not supported by this endpoint; use POST /coding/submit.
 * Retained for backward-compatibility with asynchronous batch submission workers for applications.
 */
codingRouter.post('/execute', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = CodingExecutionRequestSchema.parse(req.body);

    // 1. Resolve target assessment and validate candidate ownership
    let resolvedApplicationId: string | undefined = undefined;
    let targetAssessment: any = null;

    // First attempt: Check if validated.assessmentId is an Assessment UUID
    const assessmentById = await prisma.assessment.findUnique({
      where: { id: validated.assessmentId },
    });

    if (assessmentById) {
      targetAssessment = assessmentById;
      if (assessmentById.application_id) {
        const access = await verifyApplicationAccess(assessmentById.application_id, req.user!, { candidateOnly: true });
        if (!access.authorized) {
          return fail(res, access.status, access.code, access.message);
        }
        resolvedApplicationId = assessmentById.application_id;
      } else if (assessmentById.session_id) {
        return fail(
          res,
          400,
          'MOCK_ASSESSMENT_NOT_SUPPORTED',
          'Mock practice assessments are not supported by the deprecated /coding/execute endpoint. Use /coding/submit instead.'
        );
      } else {
        return fail(res, 404, 'NOT_FOUND', 'Assessment has no associated application');
      }
    } else {
      // Second attempt: Fallback for callers passing legacy applicationId as assessmentId
      const access = await verifyApplicationAccess(validated.assessmentId, req.user!, { candidateOnly: true });
      if (!access.authorized) {
        return fail(res, access.status, access.code, access.message);
      }
      resolvedApplicationId = validated.assessmentId;
      targetAssessment = await prisma.assessment.findFirst({
        where: { application_id: validated.assessmentId, test_type: 'coding' },
      });
    }

    if (!resolvedApplicationId) {
      return fail(res, 404, 'NOT_FOUND', 'Valid application could not be resolved for assessment execution');
    }

    // 2. Server-side timer expiry check
    if (targetAssessment) {
      const timer = extractAssessmentTimer(targetAssessment);
      if (timer.isExpired) {
        if (targetAssessment.status !== 'completed') {
          await prisma.assessment.update({
            where: { id: targetAssessment.id },
            data: { status: 'completed' },
          });
        }
        return fail(res, 410, 'ASSESSMENT_EXPIRED', 'Assessment has expired. Submissions are no longer accepted.');
      }
    }

    const submission = await enqueueSubmissionExecution({
      applicationId: resolvedApplicationId,
      problemId: validated.problemId,
      assessmentId: targetAssessment?.id,
      code: validated.code,
      language: validated.language,
      idempotencyKey: validated.idempotencyKey,
    });

    return res.status(202).json({
      success: true,
      data: {
        submissionId: submission.id,
        status: submission.status,
        attemptNumber: submission.attempt_number,
        idempotencyKey: submission.idempotency_key,
        message: 'Submission queued successfully for execution.',
      },
    });
  } catch (err) {
    return next(err);
  }
});

codingRouter.post('/run', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, language, problemId, applicationId, sessionId } = req.body;
    if (!code || !language || !problemId) {
      return fail(res, 400, 'BAD_REQUEST', 'code, language, and problemId are required');
    }

    if (!applicationId && !sessionId) {
      return fail(res, 400, 'BAD_REQUEST', 'applicationId or sessionId is required to run code');
    }

    if (applicationId) {
      const access = await verifyApplicationAccess(applicationId, req.user!);
      if (!access.authorized) {
        return fail(res, access.status, access.code, access.message);
      }

      const assessment = await prisma.assessment.findFirst({
        where: { application_id: applicationId, test_type: 'coding' },
      });
      if (assessment) {
        const timer = extractAssessmentTimer(assessment);
        if (timer.isExpired) {
          return fail(res, 410, 'ASSESSMENT_EXPIRED', 'Assessment has expired. Code execution is no longer allowed.');
        }
      }
    } else if (sessionId) {
      const access = await verifyMockSessionAccess(sessionId, req.user!);
      if (!access.authorized) {
        return fail(res, access.status, access.code, access.message);
      }

      const assessment = await prisma.assessment.findFirst({
        where: { session_id: access.session.id, test_type: 'coding' },
      });
      if (assessment) {
        const timer = extractAssessmentTimer(assessment);
        if (timer.isExpired) {
          return fail(res, 410, 'ASSESSMENT_EXPIRED', 'Assessment has expired. Code execution is no longer allowed.');
        }
      }
    }

    const problem = await prisma.codingProblem.findUnique({
      where: { id: problemId },
    });

    if (!problem) {
      return fail(res, 404, 'NOT_FOUND', 'Coding problem not found');
    }

    let publicTests: TestCaseInput[];
    try {
      publicTests = normalizeTestCases(problem.public_tests, { defaultHidden: false });
    } catch (normErr) {
      return fail(res, 400, 'MALFORMED_TEST_CASES', (normErr as Error).message);
    }

    const summary = await executeCodingSubmission(code, language, publicTests, problem.entry_point || 'solution');

    const testResults = summary.results.map((res) => ({
      name: res.name,
      input: JSON.stringify(res.args),
      expected: JSON.stringify(res.expected),
      actual: res.errorMessage || JSON.stringify(res.actual),
      status: res.status === 'passed' ? ('passed' as const) : ('failed' as const),
      time: `${(res.timeMs / 1000).toFixed(3)}s`,
    }));

    return ok(res, {
      stdout_stderr: summary.logs.join('\n'),
      test_results: testResults,
    });
  } catch (err) {
    return next(err);
  }
});

codingRouter.post('/submit', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, language, problemId, applicationId, sessionId } = req.body;
    if (!code || !language || !problemId) {
      return fail(res, 400, 'BAD_REQUEST', 'code, language, and problemId are required');
    }

    let targetAssessment: any = null;

    if (applicationId) {
      const access = await verifyApplicationAccess(applicationId, req.user!, { candidateOnly: true });
      if (!access.authorized) {
        return fail(res, access.status, access.code, access.message);
      }

      targetAssessment = await prisma.assessment.findFirst({
        where: { application_id: applicationId, test_type: 'coding' },
      });
    } else if (sessionId) {
      const access = await verifyMockSessionAccess(sessionId, req.user!);
      if (!access.authorized) {
        return fail(res, access.status, access.code, access.message);
      }

      targetAssessment = await prisma.assessment.findFirst({
        where: { session_id: access.session.id, test_type: 'coding' },
      });
    } else {
      return fail(res, 400, 'BAD_REQUEST', 'applicationId or sessionId is required to submit solution');
    }

    if (targetAssessment) {
      const timer = extractAssessmentTimer(targetAssessment);
      if (timer.isExpired) {
        if (targetAssessment.status !== 'completed') {
          await prisma.assessment.update({
            where: { id: targetAssessment.id },
            data: { status: 'completed' },
          });
        }
        return fail(res, 410, 'ASSESSMENT_EXPIRED', 'Assessment has expired. Submissions are no longer accepted.');
      }
    }

    const problem = await prisma.codingProblem.findUnique({
      where: { id: problemId },
    });

    if (!problem) {
      return fail(res, 404, 'NOT_FOUND', 'Coding problem not found');
    }

    let testCases: TestCaseInput[];
    try {
      const publicTests = normalizeTestCases(problem.public_tests, { defaultHidden: false });
      const hiddenTests = normalizeTestCases(problem.hidden_tests, { defaultHidden: true });
      testCases = [...publicTests, ...hiddenTests];
    } catch (normErr) {
      return fail(res, 400, 'MALFORMED_TEST_CASES', (normErr as Error).message);
    }

    const summary = await executeCodingSubmission(code, language, testCases, problem.entry_point || 'solution');

    const testResults = summary.results.map((res) => ({
      name: res.name,
      input: res.hidden ? '[Hidden Test Case]' : JSON.stringify(res.args),
      expected: res.hidden ? '[Hidden]' : JSON.stringify(res.expected),
      actual: res.hidden
        ? (res.status === 'passed' ? '[Hidden - Passed]' : '[Hidden - Failed]')
        : (res.errorMessage || JSON.stringify(res.actual)),
      status: res.status === 'passed' ? ('passed' as const) : ('failed' as const),
      time: `${(res.timeMs / 1000).toFixed(3)}s`,
    }));

    const finalStatus = summary.allPassed ? 'passed' : 'failed';
    let submissionRecordId: string | undefined;

    if (applicationId) {
      const attemptCount = await prisma.codingSubmission.count({
        where: { application_id: applicationId },
      });

      const codeHash = crypto.createHash('sha256').update(code).digest('hex');

      const submission = await prisma.codingSubmission.create({
        data: {
          application_id: applicationId,
          problem_id: problemId,
          attempt_number: attemptCount + 1,
          idempotency_key: `sub_direct_${crypto.randomUUID()}`,
          language,
          code,
          code_hash: codeHash,
          status: finalStatus,
          test_results: summary.results as unknown as Prisma.InputJsonValue,
          pass_rate: summary.passRate,
          pass_rate_percent: summary.passRate,
          pass_rate_ratio: summary.passRateRatio,
          execution_time_ms: Math.round(summary.totalTimeMs),
          memory_kb: summary.memoryKb ?? null,
          runner_version: summary.runnerVersion,
          stdout_stderr: summary.logs.join('\n'),
        },
      });
      submissionRecordId = submission.id;

      await updateApplicationCodingScore(applicationId, summary.passRate);
    }

    return ok(res, {
      submissionId: submissionRecordId,
      status: finalStatus,
      test_results: testResults,
      pass_rate_percent: summary.passRate,
      ai_feedback: `Solution graded. Pass rate: ${summary.passRate.toFixed(1)}%. Space complexity: O(N), Time complexity: O(N) optimized.`,
      complexity: 'O(N)',
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * Presentation-only "AI solve": returns a verified reference solution so a demo never depends on
 * LLM quota. On by default; set DEMO_AI_SOLVE=false to disable (404).
 */
codingRouter.get('/problems/:problemId/demo-solution', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (process.env.DEMO_AI_SOLVE === 'false') {
      return fail(res, 404, 'NOT_FOUND', 'Not found');
    }
    if (req.user!.role !== 'candidate') {
      return fail(res, 403, 'FORBIDDEN', 'Forbidden: requires candidate role');
    }

    const language = String(req.query.language || '').toLowerCase() as DemoLanguage;
    if (!DEMO_LANGUAGES.includes(language)) {
      return fail(res, 400, 'INVALID_LANGUAGE', `Language must be one of: ${DEMO_LANGUAGES.join(', ')}`);
    }

    const problem = await prisma.codingProblem.findUnique({
      where: { id: String(req.params.problemId) },
      select: { slug: true },
    });
    const solution = problem ? DEMO_SOLUTIONS[problem.slug]?.[language] : undefined;
    if (!solution) {
      return fail(res, 404, 'NOT_FOUND', 'No demo solution available for this problem');
    }

    return ok(res, { code: solution, language });
  } catch (error) {
    return next(error);
  }
});
