import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    codingProblem: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    codingSubmission: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    assessment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({}),
    },
    application: {
      findUnique: vi.fn(),
    },
    mockSession: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

const mockGetCandidateProfileId = vi.fn().mockImplementation(async (userId: string) => `profile-${userId}`);
vi.mock('../lib/candidate-profile', () => ({
  getCandidateProfileId: (...args: any[]) => mockGetCandidateProfileId(...args),
}));

vi.mock('@nextround/database', () => ({
  prisma: mockPrisma,
  Prisma: {
    InputJsonValue: null,
  },
}));

vi.mock('../lib/prisma', () => ({
  prisma: mockPrisma,
  Prisma: {
    InputJsonValue: null,
  },
}));

vi.mock('../middleware/auth', () => ({
  authenticate: (req: Request, res: Response, next: NextFunction) => {
    // Passes through to handler; user is mocked on req
    next();
  },
}));

vi.mock('bullmq', () => ({
  Queue: class {
    add = vi.fn();
    close = vi.fn();
  },
  Worker: class {
    close = vi.fn();
  },
}));

const mockExecuteCodingSubmission = vi.fn().mockReturnValue({
  results: [
    {
      name: 'Case 1',
      args: ['()'],
      expected: true,
      actual: true,
      status: 'passed',
      timeMs: 10,
      hidden: false,
    },
  ],
  passRate: 100,
  passRateRatio: 1.0,
  allPassed: true,
  totalTimeMs: 10,
  logs: ['[Sandbox] Execution successful'],
  runnerVersion: '2.0.0-unified-sandbox',
});

vi.mock('../services/coding/coding-executor.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/coding/coding-executor.service')>();
  return {
    ...actual,
    executeCodingSubmission: (...args: any[]) => mockExecuteCodingSubmission(...args),
  };
});

const mockUpdateApplicationCodingScore = vi.fn().mockResolvedValue(undefined);
vi.mock('../services/scoring/scoring.service', () => ({
  updateApplicationCodingScore: (...args: any[]) => mockUpdateApplicationCodingScore(...args),
}));

const mockEnqueueSubmissionExecution = vi.fn().mockResolvedValue({
  id: 'sub-queued-1',
  status: 'queued',
  attempt_number: 1,
  idempotency_key: 'sub_test_key',
});
vi.mock('../services/submission/submission-queue.service', () => ({
  enqueueSubmissionExecution: (...args: any[]) => mockEnqueueSubmissionExecution(...args),
}));

const mockSelectCodingProblem = vi.fn().mockResolvedValue({
  id: 'prob-mock-bank-1',
  slug: 'bank-mock-prob',
  title: 'Bank Mock Problem',
  category: 'Algorithms',
  difficulty: 'medium',
  description: 'A mock problem from the question bank',
  starterCode: { python: 'def solution(): pass' },
  testCases: [
    { input: [1, 2], expected: 3, hidden: false },
    { input: [4, 5], expected: 9, hidden: true },
  ],
  expectedComplexity: { time: 'O(N)', space: 'O(1)' },
});
vi.mock('../services/questions/question-bank.service', () => ({
  selectCodingProblem: (...args: any[]) => mockSelectCodingProblem(...args),
}));

import { getCodingSubmission } from '../services/application/application-coding.service';
import { getCodingSubmission as getCodingSubmissionController } from '../routes/applications/applications-assessment.controller';
import { codingRouter } from '../routes/coding/coding.routes';
import { getMockCoding } from '../routes/candidate/mock-coding.controller';

function findRouteHandler(path: string, method: 'get' | 'post') {
  const layer = (codingRouter as any).stack.find((l: any) => {
    return l.route && l.route.path === path && l.route.methods[method];
  });
  if (!layer) throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

function mockReqRes(
  body: Record<string, unknown> = {},
  user: { userId: string; role: 'candidate' | 'hr'; orgId?: string | null } | null = {
    userId: 'cand-user-a',
    role: 'candidate',
  },
  params: Record<string, string> = {}
) {
  const req = {
    body,
    query: {},
    params,
    user,
  } as unknown as Request;

  let statusCode = 200;
  let jsonResponse: any = null;

  const res = {
    status: vi.fn((code: number) => {
      statusCode = code;
      return res;
    }),
    json: vi.fn((payload: any) => {
      jsonResponse = payload;
      return res;
    }),
  } as unknown as Response;

  return {
    req,
    res,
    getStatus: () => statusCode,
    getJson: () => jsonResponse,
  };
}

describe('HireOS Coding Security Audit — Phase 5A (V-01 & V-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. V-01: Secure Coding Submission Retrieval (getCodingSubmission)', () => {
    const candidateAUser = { userId: 'cand-user-a', role: 'candidate' };
    const candidateBUser = { userId: 'cand-user-b', role: 'candidate' };
    const recruiterOrgAUser = { userId: 'hr-user-a', role: 'hr', orgId: 'org-a' };
    const recruiterOrgBUser = { userId: 'hr-user-b', role: 'hr', orgId: 'org-b' };

    const mockSubmissionCandA = {
      id: 'sub-a-1',
      application_id: 'app-cand-a',
      code: 'def solution(): return True',
      status: 'passed',
      pass_rate: 100,
      application: {
        id: 'app-cand-a',
        candidate: { user_id: 'cand-user-a' },
        job: { org_id: 'org-a' },
      },
    };

    it('Candidate A retrieves their own submission: success (200)', async () => {
      mockPrisma.codingSubmission.findUnique.mockResolvedValue(mockSubmissionCandA);

      const result = await getCodingSubmission('app-cand-a', 'sub-a-1', candidateAUser);

      expect(result).toBeDefined();
      expect(result.submission.id).toBe('sub-a-1');
      expect(result.submission.code).toBe('def solution(): return True');
    });

    it("Candidate A retrieves Candidate B's submission: rejects with 403 Forbidden", async () => {
      mockPrisma.codingSubmission.findUnique.mockResolvedValue(mockSubmissionCandA);

      // Candidate B attempts to access Candidate A's submission
      await expect(
        getCodingSubmission('app-cand-a', 'sub-a-1', candidateBUser)
      ).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('Access denied'),
      });
    });

    it('Recruiter from Organization A accesses submission for Org A job: success', async () => {
      mockPrisma.codingSubmission.findUnique.mockResolvedValue(mockSubmissionCandA);

      const result = await getCodingSubmission('app-cand-a', 'sub-a-1', recruiterOrgAUser);
      expect(result).toBeDefined();
      expect(result.submission.id).toBe('sub-a-1');
    });

    it("Recruiter from Organization B accesses Organization A's submission: rejects with 403 Forbidden", async () => {
      mockPrisma.codingSubmission.findUnique.mockResolvedValue(mockSubmissionCandA);

      // Recruiter from Org B attempts to access Org A candidate's submission
      await expect(
        getCodingSubmission('app-cand-a', 'sub-a-1', recruiterOrgBUser)
      ).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('Access denied'),
      });
    });

    it('Rejects request if submission does not match the application ID in route: 404', async () => {
      mockPrisma.codingSubmission.findUnique.mockResolvedValue(mockSubmissionCandA);

      // Route has wrong application ID
      await expect(
        getCodingSubmission('wrong-app-id', 'sub-a-1', candidateAUser)
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('Rejects non-existent submission: 404', async () => {
      mockPrisma.codingSubmission.findUnique.mockResolvedValue(null);

      await expect(
        getCodingSubmission('app-cand-a', 'non-existent-sub', candidateAUser)
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('Controller passes route params and req.user to service, returning 200 for owner', async () => {
      mockPrisma.codingSubmission.findUnique.mockResolvedValue(mockSubmissionCandA);

      const req = {
        params: { id: 'app-cand-a', submissionId: 'sub-a-1' },
        user: { userId: 'cand-user-a', role: 'candidate' },
      } as unknown as Request;

      let responseData: any = null;
      let responseStatus = 200;
      const res = {
        status: vi.fn((s: number) => {
          responseStatus = s;
          return res;
        }),
        json: vi.fn((d: any) => {
          responseData = d;
          return res;
        }),
      } as unknown as Response;

      await getCodingSubmissionController(req, res);

      expect(responseStatus).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.submission.id).toBe('sub-a-1');
    });

    it('Controller throws 403 when candidate user does not own the submission', async () => {
      mockPrisma.codingSubmission.findUnique.mockResolvedValue(mockSubmissionCandA);

      const req = {
        params: { id: 'app-cand-a', submissionId: 'sub-a-1' },
        user: { userId: 'attacker-cand', role: 'candidate' },
      } as unknown as Request;

      const res = {
        status: vi.fn(),
        json: vi.fn(),
      } as unknown as Response;

      await expect(getCodingSubmissionController(req, res)).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe('2. V-02: Secure Direct Coding Endpoints (POST /coding/*)', () => {
    const runHandler = findRouteHandler('/run', 'post');
    const submitHandler = findRouteHandler('/submit', 'post');
    const startHandler = findRouteHandler('/start', 'post');
    const executeHandler = findRouteHandler('/execute', 'post');

    const appCandA = {
      id: 'app-cand-a',
      candidate: { user_id: 'cand-user-a' },
      job: { org_id: 'org-a' },
    };

    const appCandB = {
      id: 'app-cand-b',
      candidate: { user_id: 'cand-user-b' },
      job: { org_id: 'org-b' },
    };

    it("Candidate A supplies Candidate B's application ID to /coding/submit: rejects with 403 Forbidden", async () => {
      mockPrisma.application.findUnique.mockResolvedValue(appCandB);

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          code: 'def solution(): pass',
          language: 'python',
          problemId: 'prob-1',
          applicationId: 'app-cand-b',
        },
        { userId: 'cand-user-a', role: 'candidate' } // User A passing B's appId
      );

      await submitHandler(req, res, vi.fn());

      expect(getStatus()).toBe(403);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');

      // Verify no submission was created, no score update, no execution
      expect(mockPrisma.codingSubmission.create).not.toHaveBeenCalled();
      expect(mockUpdateApplicationCodingScore).not.toHaveBeenCalled();
    });

    it("Candidate A supplies Candidate B's application ID to /coding/start: rejects with 403 Forbidden", async () => {
      mockPrisma.application.findUnique.mockResolvedValue(appCandB);

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          applicationId: 'app-cand-b',
        },
        { userId: 'cand-user-a', role: 'candidate' } // User A passing B's appId
      );

      await startHandler(req, res, vi.fn());

      expect(getStatus()).toBe(403);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');

      // Verify timer was NOT started or updated in DB
      expect(mockPrisma.assessment.update).not.toHaveBeenCalled();
    });

    it("Candidate A supplies Candidate B's application ID to /coding/run: rejects with 403 Forbidden", async () => {
      mockPrisma.application.findUnique.mockResolvedValue(appCandB);

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          code: 'print(1)',
          language: 'python',
          problemId: 'prob-1',
          applicationId: 'app-cand-b',
        },
        { userId: 'cand-user-a', role: 'candidate' }
      );

      await runHandler(req, res, vi.fn());

      expect(getStatus()).toBe(403);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');

      // Verify code was NOT executed
      expect(mockExecuteCodingSubmission).not.toHaveBeenCalled();
    });

    it("Candidate A supplies Candidate B's application ID to /coding/execute: rejects with 403 Forbidden", async () => {
      mockPrisma.application.findUnique.mockResolvedValue(appCandB);

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          assessmentId: 'app-cand-b',
          problemId: 'prob-1',
          code: 'print(1)',
          language: 'python',
        },
        { userId: 'cand-user-a', role: 'candidate' }
      );

      await executeHandler(req, res, vi.fn());

      expect(getStatus()).toBe(403);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');

      // Verify job was NOT enqueued
      expect(mockEnqueueSubmissionExecution).not.toHaveBeenCalled();
    });

    it("Recruiter from Organization A attempts to modify Organization B's application: rejects with 403", async () => {
      mockPrisma.application.findUnique.mockResolvedValue(appCandB); // Belongs to Org B

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          code: 'def solution(): pass',
          language: 'python',
          problemId: 'prob-1',
          applicationId: 'app-cand-b',
        },
        { userId: 'hr-user-a', role: 'hr', orgId: 'org-a' } // Org A HR
      );

      await submitHandler(req, res, vi.fn());

      expect(getStatus()).toBe(403);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');

      expect(mockPrisma.codingSubmission.create).not.toHaveBeenCalled();
      expect(mockUpdateApplicationCodingScore).not.toHaveBeenCalled();
    });

    it('Rejects non-existent application ID on /coding/submit: 404 Not Found', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(null);

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          code: 'def solution(): pass',
          language: 'python',
          problemId: 'prob-1',
          applicationId: 'non-existent-app',
        },
        { userId: 'cand-user-a', role: 'candidate' }
      );

      await submitHandler(req, res, vi.fn());

      expect(getStatus()).toBe(404);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('NOT_FOUND');

      expect(mockPrisma.codingSubmission.create).not.toHaveBeenCalled();
    });

    it('Candidate A with their own application ID: succeeds and creates submission', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(appCandA);
      mockPrisma.codingProblem.findUnique.mockResolvedValue({
        id: 'prob-1',
        title: 'Valid Parentheses',
        entry_point: 'solution',
        public_tests: [{ input: ['()'], expected: true }],
        hidden_tests: [],
      });
      mockPrisma.assessment.findFirst.mockResolvedValue({
        id: 'assessment-cand-a',
        status: 'in_progress',
        questions: {},
      });
      mockPrisma.codingSubmission.count.mockResolvedValue(0);
      mockPrisma.codingSubmission.create.mockResolvedValue({
        id: 'sub-new-a',
        status: 'passed',
      });

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          code: 'def solution(): return True',
          language: 'python',
          problemId: 'prob-1',
          applicationId: 'app-cand-a',
        },
        { userId: 'cand-user-a', role: 'candidate' } // Matches appCandA
      );

      await submitHandler(req, res, vi.fn());

      expect(getStatus()).toBe(200);
      const json = getJson();
      expect(json.success).toBe(true);
      expect(mockPrisma.codingSubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            application_id: 'app-cand-a',
          }),
        })
      );
      expect(mockUpdateApplicationCodingScore).toHaveBeenCalledWith('app-cand-a', 100);
    });
  });

  describe('3. Phase 5B: Mock Assessment Timer Enforcement & Session Scoping', () => {
    const runHandler = findRouteHandler('/run', 'post');
    const submitHandler = findRouteHandler('/submit', 'post');
    const startHandler = findRouteHandler('/start', 'post');

    const mockSessionCandA = {
      id: 'session-mock-a',
      candidate_id: 'profile-cand-user-a', // Matches mocked getCandidateProfileId('cand-user-a')
      target_company: 'Test Org',
      target_role: 'Software Engineer',
    };

    const mockSessionCandB = {
      id: 'session-mock-b',
      candidate_id: 'profile-cand-user-b',
      target_company: 'Test Org',
      target_role: 'Software Engineer',
    };

    it('1. Valid application assessment before expiry: allowed (200)', async () => {
      mockPrisma.application.findUnique.mockResolvedValue({
        id: 'app-valid-1',
        candidate: { user_id: 'cand-user-a' },
        job: { org_id: 'org-a' },
      });
      mockPrisma.assessment.findFirst.mockResolvedValue({
        id: 'assessment-valid-1',
        status: 'in_progress',
        questions: {
          timer_metadata: {
            started_at: new Date(Date.now() - 60000).toISOString(),
            expires_at: new Date(Date.now() + 1740000).toISOString(),
            duration_seconds: 1800,
            is_started: true,
          },
        },
      });
      mockPrisma.codingProblem.findUnique.mockResolvedValue({
        id: 'prob-1',
        title: 'Problem 1',
        entry_point: 'solution',
        public_tests: [{ input: ['()'], expected: true }],
        hidden_tests: [],
      });

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          code: 'print(1)',
          language: 'python',
          problemId: 'prob-1',
          applicationId: 'app-valid-1',
        },
        { userId: 'cand-user-a', role: 'candidate' }
      );

      await runHandler(req, res, vi.fn());

      expect(getStatus()).toBe(200);
      expect(getJson().success).toBe(true);
      expect(mockExecuteCodingSubmission).toHaveBeenCalled();
    });

    it('2. Expired application assessment: returns HTTP 410', async () => {
      mockPrisma.application.findUnique.mockResolvedValue({
        id: 'app-expired-1',
        candidate: { user_id: 'cand-user-a' },
        job: { org_id: 'org-a' },
      });
      mockPrisma.assessment.findFirst.mockResolvedValue({
        id: 'assessment-expired-1',
        status: 'in_progress',
        questions: {
          timer_metadata: {
            started_at: new Date(Date.now() - 1900000).toISOString(),
            expires_at: new Date(Date.now() - 100000).toISOString(),
            duration_seconds: 1800,
            is_started: true,
          },
        },
      });

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          code: 'print(1)',
          language: 'python',
          problemId: 'prob-1',
          applicationId: 'app-expired-1',
        },
        { userId: 'cand-user-a', role: 'candidate' }
      );

      await runHandler(req, res, vi.fn());

      expect(getStatus()).toBe(410);
      expect(getJson().error.code).toBe('ASSESSMENT_EXPIRED');
      expect(mockExecuteCodingSubmission).not.toHaveBeenCalled();
    });

    it('3. Valid mock session before expiry: allowed (200)', async () => {
      mockPrisma.mockSession.findUnique.mockResolvedValue(mockSessionCandA);
      mockPrisma.assessment.findFirst.mockResolvedValue({
        id: 'assessment-mock-valid',
        session_id: 'session-mock-a',
        status: 'in_progress',
        questions: {
          timer_metadata: {
            started_at: new Date(Date.now() - 30000).toISOString(),
            expires_at: new Date(Date.now() + 1770000).toISOString(),
            duration_seconds: 1800,
            is_started: true,
          },
        },
      });
      mockPrisma.codingProblem.findUnique.mockResolvedValue({
        id: 'prob-1',
        title: 'Problem 1',
        entry_point: 'solution',
        public_tests: [{ input: ['()'], expected: true }],
        hidden_tests: [],
      });

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          code: 'print(1)',
          language: 'python',
          problemId: 'prob-1',
          sessionId: 'session-mock-a',
        },
        { userId: 'cand-user-a', role: 'candidate' }
      );

      await runHandler(req, res, vi.fn());

      expect(getStatus()).toBe(200);
      expect(getJson().success).toBe(true);
      expect(mockExecuteCodingSubmission).toHaveBeenCalled();
    });

    it('4. Expired mock session run: returns HTTP 410 and does not execute code', async () => {
      mockPrisma.mockSession.findUnique.mockResolvedValue(mockSessionCandA);
      mockPrisma.assessment.findFirst.mockResolvedValue({
        id: 'assessment-mock-expired',
        session_id: 'session-mock-a',
        status: 'in_progress',
        questions: {
          timer_metadata: {
            started_at: new Date(Date.now() - 2000000).toISOString(),
            expires_at: new Date(Date.now() - 200000).toISOString(),
            duration_seconds: 1800,
            is_started: true,
          },
        },
      });

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          code: 'def is_valid(): pass',
          language: 'python',
          problemId: 'prob-1',
          sessionId: 'session-mock-a',
        },
        { userId: 'cand-user-a', role: 'candidate' }
      );

      await runHandler(req, res, vi.fn());

      expect(getStatus()).toBe(410);
      expect(getJson().error.code).toBe('ASSESSMENT_EXPIRED');
      expect(mockExecuteCodingSubmission).not.toHaveBeenCalled();
    });

    it('5. Expired mock session submit: returns HTTP 410, marks completed, does not execute or grade', async () => {
      mockPrisma.mockSession.findUnique.mockResolvedValue(mockSessionCandA);
      mockPrisma.assessment.findFirst.mockResolvedValue({
        id: 'assessment-mock-expired-2',
        session_id: 'session-mock-a',
        status: 'in_progress',
        questions: {
          timer_metadata: {
            started_at: new Date(Date.now() - 2000000).toISOString(),
            expires_at: new Date(Date.now() - 200000).toISOString(),
            duration_seconds: 1800,
            is_started: true,
          },
        },
      });

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          code: 'def is_valid(): return True',
          language: 'python',
          problemId: 'prob-1',
          sessionId: 'session-mock-a',
        },
        { userId: 'cand-user-a', role: 'candidate' }
      );

      await submitHandler(req, res, vi.fn());

      expect(getStatus()).toBe(410);
      expect(getJson().error.code).toBe('ASSESSMENT_EXPIRED');
      expect(mockExecuteCodingSubmission).not.toHaveBeenCalled();
      expect(mockPrisma.assessment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'assessment-mock-expired-2' },
          data: { status: 'completed' },
        })
      );
    });

    it("6. Candidate A attempts to use Candidate B's session ID: rejects with 403 Forbidden", async () => {
      // Mock session belongs to Candidate B
      mockPrisma.mockSession.findUnique.mockResolvedValue(mockSessionCandB);

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          code: 'print(1)',
          language: 'python',
          problemId: 'prob-1',
          sessionId: 'session-mock-b',
        },
        { userId: 'cand-user-a', role: 'candidate' } // User A passing User B's sessionId
      );

      await runHandler(req, res, vi.fn());

      expect(getStatus()).toBe(403);
      expect(getJson().error.code).toBe('FORBIDDEN');
      expect(mockExecuteCodingSubmission).not.toHaveBeenCalled();
    });

    it('7. Invalid / non-existent mock session ID: rejects with 404 Not Found', async () => {
      mockPrisma.mockSession.findUnique.mockResolvedValue(null);

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          code: 'print(1)',
          language: 'python',
          problemId: 'prob-1',
          sessionId: 'non-existent-session',
        },
        { userId: 'cand-user-a', role: 'candidate' }
      );

      await runHandler(req, res, vi.fn());

      expect(getStatus()).toBe(404);
      expect(getJson().error.code).toBe('NOT_FOUND');
    });

    it('8. Missing session/application identifier on submit and start: rejects with 400 Bad Request', async () => {
      // Missing both applicationId and sessionId on submit
      const submitCheck = mockReqRes(
        {
          code: 'print(1)',
          language: 'python',
          problemId: 'prob-1',
        },
        { userId: 'cand-user-a', role: 'candidate' }
      );
      await submitHandler(submitCheck.req, submitCheck.res, vi.fn());
      expect(submitCheck.getStatus()).toBe(400);
      expect(submitCheck.getJson().error.code).toBe('BAD_REQUEST');

      // Missing both applicationId and sessionId on start
      const startCheck = mockReqRes({}, { userId: 'cand-user-a', role: 'candidate' });
      await startHandler(startCheck.req, startCheck.res, vi.fn());
      expect(startCheck.getStatus()).toBe(400);
      expect(startCheck.getJson().error.code).toBe('BAD_REQUEST');
    });

    it('9. Repeated timer start for mock session does not reset the original expiration', async () => {
      mockPrisma.mockSession.findUnique.mockResolvedValue(mockSessionCandA);
      const originalStarted = new Date(Date.now() - 600000).toISOString();
      const originalExpires = new Date(Date.now() + 1200000).toISOString();

      mockPrisma.assessment.findFirst.mockResolvedValue({
        id: 'assessment-mock-active',
        session_id: 'session-mock-a',
        status: 'in_progress',
        questions: {
          timer_metadata: {
            started_at: originalStarted,
            expires_at: originalExpires,
            duration_seconds: 1800,
            is_started: true,
          },
        },
      });

      const { req, res, getStatus, getJson } = mockReqRes(
        { sessionId: 'session-mock-a' },
        { userId: 'cand-user-a', role: 'candidate' }
      );

      await startHandler(req, res, vi.fn());

      expect(getStatus()).toBe(200);
      const json = getJson();
      expect(json.success).toBe(true);
      expect(json.data.timer.startedAt).toBe(originalStarted);
      expect(json.data.timer.expiresAt).toBe(originalExpires);
    });

    it('10. Mock timer start persists is_started and timer metadata in Assessment', async () => {
      mockPrisma.mockSession.findUnique.mockResolvedValue(mockSessionCandA);
      mockPrisma.assessment.findFirst.mockResolvedValue({
        id: 'assessment-mock-fresh',
        session_id: 'session-mock-a',
        status: 'in_progress',
        questions: { title: 'Valid Parentheses' },
      });

      const { req, res, getStatus, getJson } = mockReqRes(
        { sessionId: 'session-mock-a' },
        { userId: 'cand-user-a', role: 'candidate' }
      );

      await startHandler(req, res, vi.fn());

      expect(getStatus()).toBe(200);
      const json = getJson();
      expect(json.success).toBe(true);
      expect(json.data.timer.isStarted).toBe(true);
      expect(json.data.timer.startedAt).toBeDefined();
      expect(json.data.timer.expiresAt).toBeDefined();

      expect(mockPrisma.assessment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'assessment-mock-fresh' },
          data: expect.objectContaining({
            status: 'in_progress',
            questions: expect.objectContaining({
              timer_metadata: expect.objectContaining({
                is_started: true,
              }),
            }),
          }),
        })
      );
    });
  });

  describe('4. Phase 5C: Mock Coding Controller Defensive Hardening (getMockCoding)', () => {
    it('1. Valid owned mock session returns the existing coding assessment successfully', async () => {
      mockPrisma.mockSession.findFirst.mockResolvedValue({
        id: 'session-owned-1',
        candidate_id: 'profile-cand-user-a',
        difficulty: 'medium',
      });
      mockPrisma.assessment.findFirst.mockResolvedValue({
        id: 'assess-existing-1',
        session_id: 'session-owned-1',
        test_type: 'coding',
        questions: {
          title: 'Existing Two Sum',
          difficulty: 'medium',
          testCases: [
            { input: [1, 2], expected: 3, hidden: false },
            { input: [4, 5], expected: 9, hidden: true },
          ],
        },
      });

      const { req, res, getStatus, getJson } = mockReqRes(
        {},
        { userId: 'cand-user-a', role: 'candidate' },
        { id: 'session-owned-1' }
      );

      await getMockCoding(req, res, vi.fn());

      expect(getStatus()).toBe(200);
      const json = getJson();
      expect(json.success).toBe(true);
      expect(json.data.problem.title).toBe('Existing Two Sum');
      // Hidden test case must be filtered out for candidate response
      expect(json.data.problem.testCases).toHaveLength(1);
      expect(json.data.problem.testCases[0].hidden).toBeFalsy();
      // Should not select new problem when existing assessment has questions
      expect(mockSelectCodingProblem).not.toHaveBeenCalled();
    });

    it('2. Valid owned mock session without existing assessment calls selectCodingProblem and creates Assessment', async () => {
      mockPrisma.mockSession.findFirst.mockResolvedValue({
        id: 'session-owned-new',
        candidate_id: 'profile-cand-user-a',
        difficulty: 'hard',
      });
      mockPrisma.assessment.findFirst.mockResolvedValue(null);

      const { req, res, getStatus, getJson } = mockReqRes(
        {},
        { userId: 'cand-user-a', role: 'candidate' },
        { id: 'session-owned-new' }
      );

      await getMockCoding(req, res, vi.fn());

      expect(getStatus()).toBe(200);
      const json = getJson();
      expect(json.success).toBe(true);
      expect(json.data.problem.title).toBe('Bank Mock Problem');
      expect(mockSelectCodingProblem).toHaveBeenCalledWith({ difficulty: 'hard' });
      expect(mockPrisma.assessment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            session_id: 'session-owned-new',
            test_type: 'coding',
            status: 'in_progress',
          }),
        })
      );
    });

    it('3. Invalid / non-existent session ID returns 404 and does NOT query Assessment or selectCodingProblem', async () => {
      mockPrisma.mockSession.findFirst.mockResolvedValue(null);

      const { req, res, getStatus, getJson } = mockReqRes(
        {},
        { userId: 'cand-user-a', role: 'candidate' },
        { id: 'non-existent-session-id' }
      );

      await getMockCoding(req, res, vi.fn());

      expect(getStatus()).toBe(404);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Mock session not found');

      // Crucial: Must NOT query assessment with undefined session_id or call selectCodingProblem
      expect(mockPrisma.assessment.findFirst).not.toHaveBeenCalled();
      expect(mockSelectCodingProblem).not.toHaveBeenCalled();
      expect(mockPrisma.assessment.create).not.toHaveBeenCalled();
    });

    it('4. Another candidate session ID returns 404 and does NOT query Assessment or selectCodingProblem', async () => {
      // Prisma findFirst returns null because session belongs to candidate-b, not candidate-a
      mockPrisma.mockSession.findFirst.mockResolvedValue(null);

      const { req, res, getStatus, getJson } = mockReqRes(
        {},
        { userId: 'cand-user-a', role: 'candidate' },
        { id: 'session-owned-by-cand-b' }
      );

      await getMockCoding(req, res, vi.fn());

      expect(getStatus()).toBe(404);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Mock session not found');

      // Scoping check: verify findFirst was scoped to authenticated candidate's profile
      expect(mockPrisma.mockSession.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'session-owned-by-cand-b',
          candidate_id: 'profile-cand-user-a',
        },
      });
      expect(mockPrisma.assessment.findFirst).not.toHaveBeenCalled();
      expect(mockSelectCodingProblem).not.toHaveBeenCalled();
    });

    it('5. Missing or failing candidate profile is handled safely (returns 404)', async () => {
      mockGetCandidateProfileId.mockRejectedValueOnce(new Error('Candidate profile not found in database'));

      const { req, res, getStatus, getJson } = mockReqRes(
        {},
        { userId: 'cand-unknown-user', role: 'candidate' },
        { id: 'some-session-id' }
      );

      await getMockCoding(req, res, vi.fn());

      expect(getStatus()).toBe(404);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Candidate profile not found');

      expect(mockPrisma.mockSession.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.assessment.findFirst).not.toHaveBeenCalled();
      expect(mockSelectCodingProblem).not.toHaveBeenCalled();
    });

    it('6. Empty candidate profile ID is handled safely (returns 404)', async () => {
      mockGetCandidateProfileId.mockResolvedValueOnce('');

      const { req, res, getStatus, getJson } = mockReqRes(
        {},
        { userId: 'cand-user-no-profile', role: 'candidate' },
        { id: 'some-session-id' }
      );

      await getMockCoding(req, res, vi.fn());

      expect(getStatus()).toBe(404);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Candidate profile not found');

      expect(mockPrisma.mockSession.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.assessment.findFirst).not.toHaveBeenCalled();
      expect(mockSelectCodingProblem).not.toHaveBeenCalled();
    });

    it('7. Unauthenticated request without req.user returns 401 Unauthorized', async () => {
      const { req, res, getStatus, getJson } = mockReqRes(
        {},
        null,
        { id: 'some-session-id' }
      );

      await getMockCoding(req, res, vi.fn());

      expect(getStatus()).toBe(401);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Unauthorized');

      expect(mockPrisma.mockSession.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.assessment.findFirst).not.toHaveBeenCalled();
      expect(mockSelectCodingProblem).not.toHaveBeenCalled();
    });

    it('8. Missing route param session ID returns 400 Bad Request', async () => {
      const { req, res, getStatus, getJson } = mockReqRes(
        {},
        { userId: 'cand-user-a', role: 'candidate' },
        {} // empty params
      );

      await getMockCoding(req, res, vi.fn());

      expect(getStatus()).toBe(400);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Mock session ID is required');

      expect(mockPrisma.mockSession.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.assessment.findFirst).not.toHaveBeenCalled();
      expect(mockSelectCodingProblem).not.toHaveBeenCalled();
    });

    it('9. Never queries Assessment table with undefined session_id', async () => {
      // Simulate non-existent session
      mockPrisma.mockSession.findFirst.mockResolvedValue(null);

      const { req, res } = mockReqRes(
        {},
        { userId: 'cand-user-a', role: 'candidate' },
        { id: 'missing-id' }
      );

      await getMockCoding(req, res, vi.fn());

      // Ensure no assessment query occurred, specifically not with session_id: undefined
      const findFirstCalls = mockPrisma.assessment.findFirst.mock.calls;
      for (const call of findFirstCalls) {
        expect(call[0]?.where?.session_id).toBeDefined();
        expect(call[0]?.where?.session_id).not.toBeUndefined();
      }
    });
  });

  describe('5. Phase 7: Targeted Security Fixes (/coding/execute & /coding/run)', () => {
    const executeHandler = findRouteHandler('/execute', 'post');
    const runHandler = findRouteHandler('/run', 'post');

    it('1. /coding/execute: valid application assessment queues job using real Application ID', async () => {
      mockPrisma.assessment.findUnique.mockResolvedValue({
        id: 'assess-app-valid',
        application_id: 'app-valid-1',
        status: 'in_progress',
        questions: {
          timer_metadata: {
            started_at: new Date(Date.now() - 30000).toISOString(),
            expires_at: new Date(Date.now() + 1770000).toISOString(),
            duration_seconds: 1800,
            is_started: true,
          },
        },
      });
      mockPrisma.application.findUnique.mockResolvedValue({
        id: 'app-valid-1',
        candidate: { user_id: 'cand-user-a' },
        job: { org_id: 'org-a' },
      });

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          assessmentId: 'assess-app-valid',
          problemId: 'prob-1',
          code: 'def solution(): pass',
          language: 'python',
        },
        { userId: 'cand-user-a', role: 'candidate' }
      );

      await executeHandler(req, res, vi.fn());

      expect(getStatus()).toBe(202);
      const json = getJson();
      expect(json.success).toBe(true);
      expect(json.data.submissionId).toBe('sub-queued-1');
      // Must use real Application ID, NEVER Assessment ID
      expect(mockEnqueueSubmissionExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: 'app-valid-1',
          problemId: 'prob-1',
          language: 'python',
        })
      );
      expect(mockEnqueueSubmissionExecution).not.toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: 'assess-app-valid',
        })
      );
    });

    it('2. /coding/execute: mock assessment ID is rejected with 400 and does NOT enqueue or create submission', async () => {
      mockPrisma.assessment.findUnique.mockResolvedValue({
        id: 'assess-mock-valid',
        session_id: 'session-mock-valid-1',
        status: 'in_progress',
        questions: {
          timer_metadata: {
            started_at: new Date(Date.now() - 30000).toISOString(),
            expires_at: new Date(Date.now() + 1770000).toISOString(),
            duration_seconds: 1800,
            is_started: true,
          },
        },
      });

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          assessmentId: 'assess-mock-valid',
          problemId: 'prob-1',
          code: 'def solution(): pass',
          language: 'python',
        },
        { userId: 'cand-user-a', role: 'candidate' }
      );

      await executeHandler(req, res, vi.fn());

      expect(getStatus()).toBe(400);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('MOCK_ASSESSMENT_NOT_SUPPORTED');
      expect(json.error.message).toContain('Mock practice assessments are not supported by the deprecated /coding/execute');
      expect(mockEnqueueSubmissionExecution).not.toHaveBeenCalled();
    });

    it('2b. /coding/execute: valid legacy Application ID continues to work and queues using Application ID', async () => {
      mockPrisma.assessment.findUnique.mockResolvedValue(null);
      mockPrisma.application.findUnique.mockResolvedValue({
        id: 'app-legacy-1',
        candidate: { user_id: 'cand-user-a' },
        job: { org_id: 'org-a' },
      });
      mockPrisma.assessment.findFirst.mockResolvedValue({
        id: 'assess-app-legacy',
        application_id: 'app-legacy-1',
        status: 'in_progress',
        questions: {
          timer_metadata: {
            started_at: new Date(Date.now() - 30000).toISOString(),
            expires_at: new Date(Date.now() + 1770000).toISOString(),
            duration_seconds: 1800,
            is_started: true,
          },
        },
      });

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          assessmentId: 'app-legacy-1',
          problemId: 'prob-1',
          code: 'def solution(): pass',
          language: 'python',
        },
        { userId: 'cand-user-a', role: 'candidate' }
      );

      await executeHandler(req, res, vi.fn());

      expect(getStatus()).toBe(202);
      const json = getJson();
      expect(json.success).toBe(true);
      expect(mockEnqueueSubmissionExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: 'app-legacy-1',
          problemId: 'prob-1',
        })
      );
    });

    it('3. /coding/execute: foreign candidate assessment rejects with 403 and does NOT enqueue', async () => {
      mockPrisma.assessment.findUnique.mockResolvedValue({
        id: 'assess-foreign-1',
        application_id: 'app-cand-b',
        status: 'in_progress',
        questions: {},
      });
      mockPrisma.application.findUnique.mockResolvedValue({
        id: 'app-cand-b',
        candidate: { user_id: 'cand-user-b' },
        job: { org_id: 'org-b' },
      });

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          assessmentId: 'assess-foreign-1',
          problemId: 'prob-1',
          code: 'def solution(): pass',
          language: 'python',
        },
        { userId: 'cand-user-a', role: 'candidate' } // Candidate A trying to access Candidate B's assessment
      );

      await executeHandler(req, res, vi.fn());

      expect(getStatus()).toBe(403);
      expect(getJson().success).toBe(false);
      expect(mockEnqueueSubmissionExecution).not.toHaveBeenCalled();
    });

    it('4. /coding/execute: expired assessment returns 410 and does NOT enqueue', async () => {
      mockPrisma.assessment.findUnique.mockResolvedValue({
        id: 'assess-expired-1',
        application_id: 'app-valid-1',
        status: 'in_progress',
        questions: {
          timer_metadata: {
            started_at: new Date(Date.now() - 2000000).toISOString(),
            expires_at: new Date(Date.now() - 200000).toISOString(),
            duration_seconds: 1800,
            is_started: true,
          },
        },
      });
      mockPrisma.application.findUnique.mockResolvedValue({
        id: 'app-valid-1',
        candidate: { user_id: 'cand-user-a' },
        job: { org_id: 'org-a' },
      });

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          assessmentId: 'assess-expired-1',
          problemId: 'prob-1',
          code: 'def solution(): pass',
          language: 'python',
        },
        { userId: 'cand-user-a', role: 'candidate' }
      );

      await executeHandler(req, res, vi.fn());

      expect(getStatus()).toBe(410);
      expect(getJson().error.code).toBe('ASSESSMENT_EXPIRED');
      expect(mockEnqueueSubmissionExecution).not.toHaveBeenCalled();
    });

    it('5. /coding/execute: invalid assessment ID returns 404 and does NOT enqueue', async () => {
      mockPrisma.assessment.findUnique.mockResolvedValue(null);
      mockPrisma.application.findUnique.mockResolvedValue(null);

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          assessmentId: 'non-existent-assessment-uuid',
          problemId: 'prob-1',
          code: 'def solution(): pass',
          language: 'python',
        },
        { userId: 'cand-user-a', role: 'candidate' }
      );

      await executeHandler(req, res, vi.fn());

      expect(getStatus()).toBe(404);
      expect(getJson().success).toBe(false);
      expect(mockEnqueueSubmissionExecution).not.toHaveBeenCalled();
    });

    it('6. /coding/run: missing both applicationId and sessionId returns 400 Bad Request', async () => {
      const { req, res, getStatus, getJson } = mockReqRes(
        {
          code: 'def solution(): pass',
          language: 'python',
          problemId: 'prob-1',
          // neither applicationId nor sessionId provided
        },
        { userId: 'cand-user-a', role: 'candidate' }
      );

      await runHandler(req, res, vi.fn());

      expect(getStatus()).toBe(400);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('BAD_REQUEST');
      expect(json.error.message).toContain('applicationId or sessionId is required to run code');
      expect(mockExecuteCodingSubmission).not.toHaveBeenCalled();
    });

    it('7. /coding/run: valid application request authorizes and executes code', async () => {
      mockPrisma.application.findUnique.mockResolvedValue({
        id: 'app-run-valid-1',
        candidate: { user_id: 'cand-user-a' },
        job: { org_id: 'org-a' },
      });
      mockPrisma.assessment.findFirst.mockResolvedValue({
        id: 'assess-run-1',
        application_id: 'app-run-valid-1',
        status: 'in_progress',
        questions: {
          timer_metadata: {
            started_at: new Date(Date.now() - 30000).toISOString(),
            expires_at: new Date(Date.now() + 1770000).toISOString(),
            duration_seconds: 1800,
            is_started: true,
          },
        },
      });
      mockPrisma.codingProblem.findUnique.mockResolvedValue({
        id: 'prob-1',
        entry_point: 'solution',
        public_tests: [{ input: ['()'], expected: true }],
      });

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          code: 'def solution(): pass',
          language: 'python',
          problemId: 'prob-1',
          applicationId: 'app-run-valid-1',
        },
        { userId: 'cand-user-a', role: 'candidate' }
      );

      await runHandler(req, res, vi.fn());

      expect(getStatus()).toBe(200);
      expect(getJson().success).toBe(true);
      expect(mockExecuteCodingSubmission).toHaveBeenCalled();
    });

    it('8. /coding/run: valid mock-session request authorizes and executes code', async () => {
      mockPrisma.mockSession.findUnique.mockResolvedValue({
        id: 'session-run-valid-1',
        candidate_id: 'profile-cand-user-a',
      });
      mockPrisma.assessment.findFirst.mockResolvedValue({
        id: 'assess-mock-run-1',
        session_id: 'session-run-valid-1',
        status: 'in_progress',
        questions: {
          timer_metadata: {
            started_at: new Date(Date.now() - 30000).toISOString(),
            expires_at: new Date(Date.now() + 1770000).toISOString(),
            duration_seconds: 1800,
            is_started: true,
          },
        },
      });
      mockPrisma.codingProblem.findUnique.mockResolvedValue({
        id: 'prob-1',
        entry_point: 'solution',
        public_tests: [{ input: ['()'], expected: true }],
      });

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          code: 'def solution(): pass',
          language: 'python',
          problemId: 'prob-1',
          sessionId: 'session-run-valid-1',
        },
        { userId: 'cand-user-a', role: 'candidate' }
      );

      await runHandler(req, res, vi.fn());

      expect(getStatus()).toBe(200);
      expect(getJson().success).toBe(true);
      expect(mockExecuteCodingSubmission).toHaveBeenCalled();
    });

    it('9. /coding/run: expired assessment returns 410 and does NOT execute code', async () => {
      mockPrisma.application.findUnique.mockResolvedValue({
        id: 'app-run-expired-1',
        candidate: { user_id: 'cand-user-a' },
        job: { org_id: 'org-a' },
      });
      mockPrisma.assessment.findFirst.mockResolvedValue({
        id: 'assess-run-expired-1',
        application_id: 'app-run-expired-1',
        status: 'in_progress',
        questions: {
          timer_metadata: {
            started_at: new Date(Date.now() - 2000000).toISOString(),
            expires_at: new Date(Date.now() - 200000).toISOString(),
            duration_seconds: 1800,
            is_started: true,
          },
        },
      });

      const { req, res, getStatus, getJson } = mockReqRes(
        {
          code: 'def solution(): pass',
          language: 'python',
          problemId: 'prob-1',
          applicationId: 'app-run-expired-1',
        },
        { userId: 'cand-user-a', role: 'candidate' }
      );

      await runHandler(req, res, vi.fn());

      expect(getStatus()).toBe(410);
      expect(getJson().error.code).toBe('ASSESSMENT_EXPIRED');
      expect(mockExecuteCodingSubmission).not.toHaveBeenCalled();
    });

    it('10. Unauthorized requests do not execute code or enqueue jobs', async () => {
      mockPrisma.application.findUnique.mockResolvedValue({
        id: 'app-cand-b',
        candidate: { user_id: 'cand-user-b' },
        job: { org_id: 'org-b' },
      });

      const { req, res, getStatus } = mockReqRes(
        {
          code: 'def solution(): pass',
          language: 'python',
          problemId: 'prob-1',
          applicationId: 'app-cand-b',
        },
        { userId: 'cand-user-a', role: 'candidate' }
      );

      await runHandler(req, res, vi.fn());

      expect(getStatus()).toBe(403);
      expect(mockExecuteCodingSubmission).not.toHaveBeenCalled();
      expect(mockEnqueueSubmissionExecution).not.toHaveBeenCalled();
    });
  });
});
