import { prisma, Prisma } from '@nextround/database';
import { selectCodingProblem } from '../questions/question-bank.service';
import { executeCodingSubmission, normalizeTestCases } from '../coding/coding-executor.service';
import { notFound, forbidden, badRequest } from '../../lib/http-errors';
import { getCandidateProfileId } from '../../lib/candidate-profile';
import {
  extractAssessmentTimer,
  initializeOrResumeTimer,
  DEFAULT_CODING_DURATION_SECONDS,
} from '../assessment/assessment-timer.service';

function getAppForCandidate(appId: string, userId: string) {
  return prisma.application.findUnique({
    where: { id: appId },
    include: { candidate: true, job: true },
  });
}

interface CodingTestCase {
  name?: string;
  args?: unknown[];
  expected?: unknown;
  hidden?: boolean;
}

interface CodingProblemStructure {
  id?: string;
  slug?: string;
  title?: string;
  description?: string;
  difficulty?: string;
  entryPoint?: string;
  paramSchema?: Array<{ name: string; type: string }>;
  returnType?: string;
  testCases?: CodingTestCase[];
  publicTests?: CodingTestCase[];
  hiddenTests?: CodingTestCase[];
}

export async function getCodingAssessment(appId: string, userId: string) {
  const application = await getAppForCandidate(appId, userId);
  if (!application || application.candidate.user_id !== userId) {
    throw forbidden('Forbidden: Access denied');
  }

  const jobConfig = (application.job?.thresholds as Record<string, unknown>) || {};
  const durationSeconds =
    Number(
      jobConfig.time_limit_seconds ||
        jobConfig.duration_seconds ||
        (Number(jobConfig.duration_minutes || 30) * 60)
    ) || DEFAULT_CODING_DURATION_SECONDS;

  let assessment = await prisma.assessment.findFirst({
    where: { application_id: appId, test_type: 'coding' },
  });

  let problem: CodingProblemStructure;

  if (assessment && assessment.questions) {
    problem = assessment.questions as unknown as CodingProblemStructure;
  } else {
    const difficulty = jobConfig.difficulty as 'easy' | 'medium' | 'hard' | undefined;

    const selected = await selectCodingProblem({ difficulty });
    problem = selected as unknown as CodingProblemStructure;

    assessment = await prisma.assessment.create({
      data: {
        application_id: appId,
        test_type: 'coding',
        questions: problem as unknown as Prisma.InputJsonValue,
        status: 'in_progress',
      },
    });
  }

  const sanitizedProblem = {
    ...problem,
    testCases: (problem.testCases || []).filter((testCase) => !testCase.hidden),
  };

  const timer = extractAssessmentTimer(assessment, durationSeconds);

  return { problem: sanitizedProblem, timer };
}

export async function startCodingAssessment(appId: string, userId: string) {
  const application = await getAppForCandidate(appId, userId);
  if (!application || application.candidate.user_id !== userId) {
    throw forbidden('Forbidden: Access denied');
  }

  const assessment = await prisma.assessment.findFirst({
    where: { application_id: appId, test_type: 'coding' },
  });

  if (!assessment) {
    throw notFound('Coding assessment not found. Please retrieve the problem first.');
  }

  if (assessment.status === 'completed') {
    throw badRequest('Assessment is already completed and cannot be restarted.');
  }

  const jobConfig = (application.job?.thresholds as Record<string, unknown>) || {};
  const durationSeconds =
    Number(
      jobConfig.time_limit_seconds ||
        jobConfig.duration_seconds ||
        (Number(jobConfig.duration_minutes || 30) * 60)
    ) || DEFAULT_CODING_DURATION_SECONDS;

  const { updatedQuestions, timer } = initializeOrResumeTimer(
    assessment,
    durationSeconds
  );

  await prisma.assessment.update({
    where: { id: assessment.id },
    data: {
      status: 'in_progress',
      questions: updatedQuestions,
    },
  });

  return { timer };
}

export async function submitCoding(
  appId: string,
  userId: string,
  body: { code?: string; language?: string }
) {
  const application = await getAppForCandidate(appId, userId);
  if (!application || application.candidate.user_id !== userId) {
    throw forbidden('Forbidden: Access denied');
  }

  const { code, language } = body;

  const assessment = await prisma.assessment.findFirst({
    where: { application_id: appId, test_type: 'coding' },
  });

  if (!assessment) {
    throw notFound('Coding assessment not found. Please retrieve the problem first.');
  }

  const timer = extractAssessmentTimer(assessment);
  if (timer.isExpired) {
    if (assessment.status !== 'completed') {
      await prisma.assessment.update({
        where: { id: assessment.id },
        data: { status: 'completed' },
      });
    }
    throw badRequest('Assessment has expired. Submissions are no longer accepted.');
  }

  const currentProblem = assessment.questions as unknown as CodingProblemStructure;
  const rawTestCases = currentProblem.testCases || [];
  const testCasesToRun = normalizeTestCases(rawTestCases);

  // Problems stored before entryPoint was persisted fall back to the problem row.
  let entryPoint = currentProblem.entryPoint;
  if (!entryPoint && currentProblem.id) {
    const row = await prisma.codingProblem.findUnique({
      where: { id: currentProblem.id },
      select: { entry_point: true },
    });
    entryPoint = row?.entry_point || undefined;
  }

  const execSummary = await executeCodingSubmission(
    code || '',
    language || 'python',
    testCasesToRun,
    entryPoint || 'solution'
  );

  const submission = await prisma.codingSubmission.create({
    data: {
      application_id: appId,
      problem_id: currentProblem.id || null,
      code: code || '',
      language: language || 'python',
      status: execSummary.allPassed ? 'passed' : 'failed',
      test_results: JSON.parse(
        JSON.stringify({
          status: execSummary.allPassed ? 'passed' : 'failed',
          passRate: execSummary.passRate,
          results: execSummary.results,
          logs: execSummary.logs,
          ai_feedback: execSummary.allPassed
            ? 'All test cases passed cleanly!'
            : `${execSummary.passRate}% pass rate achieved.`,
        })
      ),
      pass_rate: execSummary.passRate,
      pass_rate_percent: execSummary.passRate,
      pass_rate_ratio: execSummary.passRateRatio,
    },
  });

  await prisma.assessment.update({
    where: { id: assessment.id },
    data: {
      status: 'completed',
      score: execSummary.passRate,
    },
  });

  await prisma.evaluation.upsert({
    where: { application_id: appId },
    create: {
      application_id: appId,
      stage: 'assessment',
      coding_score: execSummary.passRate,
      reasoning: `Candidate achieved ${execSummary.passRate}% pass rate on coding assessment. Pending recruiter evaluation.`,
    },
    update: {
      coding_score: execSummary.passRate,
      reasoning: `Candidate achieved ${execSummary.passRate}% pass rate on coding assessment. Pending recruiter evaluation.`,
    },
  });

  return {
    submissionId: submission.id,
    status: submission.status,
    passRate: execSummary.passRate,
    results: execSummary.results,
  };
}

export async function getCodingSubmission(
  appId: string,
  submissionId: string,
  user: { userId: string; role: string; orgId?: string | null }
) {
  const submission = await prisma.codingSubmission.findUnique({
    where: { id: submissionId },
    include: {
      application: {
        include: {
          candidate: true,
          job: true,
        },
      },
    },
  });

  if (!submission) {
    throw notFound('Submission not found');
  }

  if (!submission.application || submission.application_id !== appId) {
    throw notFound('Submission not found for this application');
  }

  if (user.role === 'candidate') {
    if (submission.application.candidate.user_id !== user.userId) {
      throw forbidden('Forbidden: Access denied to submission');
    }
  } else if (user.role === 'hr') {
    if (!user.orgId || submission.application.job.org_id !== user.orgId) {
      throw forbidden('Forbidden: Access denied to submission');
    }
  } else {
    throw forbidden('Forbidden: Invalid role');
  }

  return { submission };
}

export interface VerifyApplicationAccessOptions {
  candidateOnly?: boolean;
}

export async function verifyApplicationAccess(
  applicationId: string,
  user: { userId: string; role: string; orgId?: string | null },
  options: VerifyApplicationAccessOptions = {}
): Promise<
  | { authorized: true; application: any }
  | { authorized: false; status: 403 | 404; code: string; message: string }
> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { candidate: true, job: true },
  });

  if (!application) {
    return {
      authorized: false,
      status: 404,
      code: 'NOT_FOUND',
      message: 'Application not found',
    };
  }

  if (user.role === 'candidate') {
    if (application.candidate.user_id !== user.userId) {
      return {
        authorized: false,
        status: 403,
        code: 'FORBIDDEN',
        message: 'Access denied to application',
      };
    }
  } else if (user.role === 'hr') {
    if (!user.orgId || application.job.org_id !== user.orgId) {
      return {
        authorized: false,
        status: 403,
        code: 'FORBIDDEN',
        message: 'Access denied to application',
      };
    }
    if (options.candidateOnly) {
      return {
        authorized: false,
        status: 403,
        code: 'FORBIDDEN',
        message: 'Forbidden: requires candidate role',
      };
    }
  } else {
    return {
      authorized: false,
      status: 403,
      code: 'FORBIDDEN',
      message: 'Forbidden: Invalid role',
    };
  }

  return { authorized: true, application };
}

export async function verifyMockSessionAccess(
  sessionId: string,
  user: { userId: string; role: string }
): Promise<
  | { authorized: true; session: any }
  | { authorized: false; status: 403 | 404; code: string; message: string }
> {
  if (user.role !== 'candidate') {
    return {
      authorized: false,
      status: 403,
      code: 'FORBIDDEN',
      message: 'Forbidden: requires candidate role for mock practice sessions',
    };
  }

  let candidateId: string;
  try {
    candidateId = await getCandidateProfileId(user.userId);
  } catch {
    return {
      authorized: false,
      status: 403,
      code: 'FORBIDDEN',
      message: 'Candidate profile not found',
    };
  }

  const session = await prisma.mockSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return {
      authorized: false,
      status: 404,
      code: 'NOT_FOUND',
      message: 'Mock session not found',
    };
  }

  if (session.candidate_id !== candidateId) {
    return {
      authorized: false,
      status: 403,
      code: 'FORBIDDEN',
      message: 'Access denied to mock session',
    };
  }

  return { authorized: true, session };
}
