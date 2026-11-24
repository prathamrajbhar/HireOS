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

vi.mock('../lib/candidate-profile', () => ({
  getCandidateProfileId: vi.fn().mockImplementation(async (userId: string) => `profile-${userId}`),
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

vi.mock('../services/coding/coding-executor.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/coding/coding-executor.service')>();
  return {
    ...actual,
    executeCodingSubmission: vi.fn().mockReturnValue({
      results: [
        {
          name: 'Case 1',
          args: ['()'],
          expected: true,
          actual: true,
          status: 'passed',
          timeMs: 12.5,
          hidden: false,
        },
        {
          name: 'Case 2',
          args: ['(]'],
          expected: false,
          actual: false,
          status: 'passed',
          timeMs: 10.1,
          hidden: false,
        },
      ],
      passRate: 100,
      passRateRatio: 1.0,
      allPassed: true,
      totalTimeMs: 22.6,
      logs: ['[Sandbox] Executed successfully'],
      runnerVersion: '2.0.0-unified-sandbox',
    }),
  };
});

vi.mock('../services/scoring/scoring.service', () => ({
  updateApplicationCodingScore: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../middleware/auth', () => ({
  authenticate: (req: Request, res: Response, next: NextFunction) => {
    (req as any).user = { userId: 'user-candidate-1', role: 'candidate' };
    next();
  },
}));

import { codingRouter } from '../routes/coding/coding.routes';

function mockReqRes(body: Record<string, unknown> = {}, query: Record<string, unknown> = {}) {
  const req = {
    body,
    query,
    user: { userId: 'user-candidate-1', role: 'candidate' },
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

  return { req, res, getStatus: () => statusCode, getJson: () => jsonResponse };
}

function findRouteHandler(path: string, method: 'get' | 'post') {
  const layer = (codingRouter as any).stack.find((l: any) => {
    return l.route && l.route.path === path && l.route.methods[method];
  });
  if (!layer) throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

describe('Coding Routes API Contracts (P0)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.application.findUnique.mockResolvedValue({
      id: 'app-default',
      candidate: { user_id: 'user-candidate-1' },
      job: { org_id: 'org-1' },
    });
  });

  describe('POST /run', () => {
    const runHandler = findRouteHandler('/run', 'post');

    it('returns 400 with fail envelope when required body fields are missing', async () => {
      const { req, res, getStatus, getJson } = mockReqRes({ code: 'print(1)' });
      await runHandler(req, res, vi.fn());

      expect(getStatus()).toBe(400);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
      expect(json.error.code).toBe('BAD_REQUEST');
      expect(json.error.message).toContain('code, language, and problemId are required');
    });

    it('returns 400 with fail envelope when applicationId and sessionId are missing', async () => {
      const { req, res, getStatus, getJson } = mockReqRes({
        code: 'def is_valid(): pass',
        language: 'python',
        problemId: 'prob-1',
      });
      await runHandler(req, res, vi.fn());

      expect(getStatus()).toBe(400);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('BAD_REQUEST');
      expect(json.error.message).toContain('applicationId or sessionId is required');
    });

    it('returns 404 with fail envelope when problem is not found', async () => {
      mockPrisma.application.findUnique.mockResolvedValue({
        id: 'app-contract-1',
        candidate: { user_id: 'user-candidate-1' },
        job: { org_id: 'org-a' },
      });
      mockPrisma.codingProblem.findUnique.mockResolvedValue(null);

      const { req, res, getStatus, getJson } = mockReqRes({
        code: 'def is_valid(): pass',
        language: 'python',
        problemId: 'non-existent-id',
        applicationId: 'app-contract-1',
      });
      await runHandler(req, res, vi.fn());

      expect(getStatus()).toBe(404);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('returns 200 with standard ApiEnvelope data containing stdout_stderr and test_results', async () => {
      mockPrisma.application.findUnique.mockResolvedValue({
        id: 'app-contract-1',
        candidate: { user_id: 'user-candidate-1' },
        job: { org_id: 'org-a' },
      });
      mockPrisma.codingProblem.findUnique.mockResolvedValue({
        id: 'prob-valid-parentheses',
        entry_point: 'is_valid',
        public_tests: [{ name: 'Case 1', args: ['()'], expected: true }],
      });

      const { req, res, getStatus, getJson } = mockReqRes({
        code: 'def is_valid(s): return True',
        language: 'python',
        problemId: 'prob-valid-parentheses',
        applicationId: 'app-contract-1',
      });
      await runHandler(req, res, vi.fn());

      expect(getStatus()).toBe(200);
      const json = getJson();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data).toHaveProperty('stdout_stderr');
      expect(json.data).toHaveProperty('test_results');
      expect(Array.isArray(json.data.test_results)).toBe(true);
      expect(json.data.test_results[0]).toMatchObject({
        name: 'Case 1',
        status: 'passed',
      });
    });
  });

  describe('POST /submit', () => {
    const submitHandler = findRouteHandler('/submit', 'post');

    it('returns 400 with fail envelope when required body fields are missing', async () => {
      const { req, res, getStatus, getJson } = mockReqRes({ problemId: 'prob-1' });
      await submitHandler(req, res, vi.fn());

      expect(getStatus()).toBe(400);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('BAD_REQUEST');
    });

    it('returns 404 with fail envelope when problem is not found', async () => {
      mockPrisma.codingProblem.findUnique.mockResolvedValue(null);

      const { req, res, getStatus, getJson } = mockReqRes({
        code: 'def is_valid(): pass',
        language: 'python',
        problemId: 'missing-id',
        applicationId: 'app-abc-123',
      });
      await submitHandler(req, res, vi.fn());

      expect(getStatus()).toBe(404);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('returns 200 with standard ApiEnvelope data containing test_results, pass_rate_percent, and ai_feedback', async () => {
      mockPrisma.codingProblem.findUnique.mockResolvedValue({
        id: 'prob-valid-parentheses',
        entry_point: 'is_valid',
        public_tests: [{ name: 'Case 1', args: ['()'], expected: true }],
        hidden_tests: [{ name: 'Case 2', args: ['(]'], expected: false }],
      });
      mockPrisma.codingSubmission.count.mockResolvedValue(0);
      mockPrisma.codingSubmission.create.mockResolvedValue({
        id: 'sub-new-123',
        status: 'passed',
      });

      const { req, res, getStatus, getJson } = mockReqRes({
        code: 'def is_valid(s): return True',
        language: 'python',
        problemId: 'prob-valid-parentheses',
        applicationId: 'app-abc-123',
      });
      await submitHandler(req, res, vi.fn());

      expect(getStatus()).toBe(200);
      const json = getJson();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.submissionId).toBe('sub-new-123');
      expect(json.data.status).toBe('passed');
      expect(json.data.pass_rate_percent).toBe(100);
      expect(json.data.test_results).toHaveLength(2);
      expect(json.data.ai_feedback).toBeDefined();
      expect(json.data.complexity).toBe('O(N)');
    });

    it('rejects submission with 410 when assessment is expired', async () => {
      const pastTime = new Date(Date.now() - 60000).toISOString();
      mockPrisma.assessment.findFirst.mockResolvedValue({
        id: 'assessment-expired-1',
        status: 'in_progress',
        questions: {
          timer_metadata: {
            started_at: new Date(Date.now() - 1900000).toISOString(),
            expires_at: pastTime,
            duration_seconds: 1800,
            is_started: true,
          },
        },
      });

      const { req, res, getStatus, getJson } = mockReqRes({
        code: 'def is_valid(): pass',
        language: 'python',
        problemId: 'prob-1',
        applicationId: 'app-expired-1',
      });
      await submitHandler(req, res, vi.fn());

      expect(getStatus()).toBe(410);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('ASSESSMENT_EXPIRED');
      expect(mockPrisma.assessment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'assessment-expired-1' },
          data: { status: 'completed' },
        })
      );
    });
  });

  describe('POST /start (Phase 3 Server Timer)', () => {
    const startHandler = findRouteHandler('/start', 'post');

    it('starts timer for application and returns timer metadata', async () => {
      mockPrisma.assessment.findFirst.mockResolvedValue({
        id: 'assessment-fresh-1',
        status: 'in_progress',
        questions: { title: 'Valid Parentheses' },
      });

      const { req, res, getStatus, getJson } = mockReqRes({
        applicationId: 'app-start-1',
      });
      await startHandler(req, res, vi.fn());

      expect(getStatus()).toBe(200);
      const json = getJson();
      expect(json.success).toBe(true);
      expect(json.data.timer).toBeDefined();
      expect(json.data.timer.isStarted).toBe(true);
      expect(json.data.timer.startedAt).toBeDefined();
      expect(json.data.timer.expiresAt).toBeDefined();
      expect(json.data.timer.durationSeconds).toBe(1800);
    });

    it('rejects start with 400 if assessment is already completed', async () => {
      mockPrisma.assessment.findFirst.mockResolvedValue({
        id: 'assessment-done-1',
        status: 'completed',
        questions: {},
      });

      const { req, res, getStatus, getJson } = mockReqRes({
        applicationId: 'app-done-1',
      });
      await startHandler(req, res, vi.fn());

      expect(getStatus()).toBe(400);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('ASSESSMENT_COMPLETED');
    });
  });
});
