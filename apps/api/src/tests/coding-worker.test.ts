import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    codingProblem: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    codingSubmission: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    assessment: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    evaluation: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      upsert: vi.fn().mockResolvedValue({}),
    },
    application: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    $queryRawUnsafe: vi.fn().mockResolvedValue([{ pg_advisory_xact_lock: null }]),
    $transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockPrisma)),
  },
}));

vi.mock('ioredis', () => {
  return {
    default: class MockRedis {
      on = vi.fn();
      quit = vi.fn().mockResolvedValue('OK');
      disconnect = vi.fn();
    },
  };
});

let registeredWorkerFailedHandler: ((job: any, err: any) => Promise<void>) | null = null;
let registeredWorkerCompletedHandler: ((job: any) => void) | null = null;

const mockJobRemove = vi.fn().mockResolvedValue(undefined);
const mockJobGetState = vi.fn().mockResolvedValue('active');

vi.mock('bullmq', () => ({
  UnrecoverableError: class UnrecoverableError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'UnrecoverableError';
    }
  },
  Queue: class {
    add = vi.fn().mockResolvedValue({ id: 'bullmq-job-1' });
    getJob = vi.fn().mockResolvedValue({
      id: 'bullmq-job-1',
      getState: mockJobGetState,
      remove: mockJobRemove,
    });
    close = vi.fn().mockResolvedValue(undefined);
  },
  Worker: class {
    close = vi.fn().mockResolvedValue(undefined);
    on = vi.fn((event: string, handler: any) => {
      if (event === 'failed') registeredWorkerFailedHandler = handler;
      if (event === 'completed') registeredWorkerCompletedHandler = handler;
    });
  },
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

const mockUpdateApplicationCodingScore = vi.fn().mockResolvedValue({
  passRatePercent: 100,
  passRateRatio: 1.0,
  score: 100,
});
vi.mock('../services/scoring/scoring.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/scoring/scoring.service')>();
  return {
    ...actual,
    updateApplicationCodingScore: (...args: any[]) => mockUpdateApplicationCodingScore(...args),
  };
});

const mockQueueAdd = vi.fn().mockResolvedValue({ id: 'bullmq-job-1' });
const mockQueueGetJob = vi.fn().mockResolvedValue({
  id: 'bullmq-job-1',
  getState: mockJobGetState,
  remove: mockJobRemove,
});

vi.mock('../lib/bullmq', () => ({
  getQueue: vi.fn(() => ({
    add: (...args: any[]) => mockQueueAdd(...args),
    getJob: (...args: any[]) => mockQueueGetJob(...args),
  })),
  JOB_NAMES: {
    coding: 'evaluate_coding',
  },
  DEFAULT_JOB_OPTIONS: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
}));

const mockExecuteCodingSubmission = vi.fn().mockResolvedValue({
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

import {
  enqueueSubmissionExecution,
  processSubmissionJob,
  reconcileStaleQueuedSubmissions,
  parseLease,
} from '../services/submission/submission-queue.service';
import { updateApplicationCodingScore } from '../services/scoring/scoring.service';
import { CodingWorker } from '../workers/coding.worker';
import * as processManager from '../services/coding/process-manager';

describe('Phase 9E.1C — Worker Lifecycle, Reconciliation & Concurrency Hardening', () => {
  const activeWorkers: CodingWorker[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    registeredWorkerFailedHandler = null;
    registeredWorkerCompletedHandler = null;
    processManager.resetProcessShutdownHandlerForTests();

    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
    mockPrisma.$queryRawUnsafe.mockResolvedValue([{ pg_advisory_xact_lock: null }]);
    mockJobGetState.mockResolvedValue('active');
    mockQueueGetJob.mockResolvedValue({
      id: 'bullmq-job-1',
      getState: mockJobGetState,
      remove: mockJobRemove,
    });
  });

  afterEach(async () => {
    processManager.resetProcessShutdownHandlerForTests();
    // Stop all workers started during test to guarantee no dangling resources
    while (activeWorkers.length > 0) {
      const w = activeWorkers.pop();
      if (w) await w.stop().catch(() => {});
    }
  });

  describe('1. Overall Execution Deadline Enforcement', () => {
    it('1. Stops launching further test cases and marks remaining cases as timed_out when overall deadline expires', async () => {
      const actualExecutor = await vi.importActual<typeof import('../services/coding/coding-executor.service')>(
        '../services/coding/coding-executor.service'
      );

      // Unconditional assertion: verify executeCodingSubmission exists as a function
      expect(typeof actualExecutor.executeCodingSubmission).toBe('function');

      const testCases = [
        { name: 'Case 1', args: ['()'], expected: true },
        { name: 'Case 2', args: ['[]'], expected: true },
        { name: 'Case 3', args: ['{}'], expected: true },
      ];

      // Call actual executor with an already-expired overall budget (0 ms remaining)
      const summary = await actualExecutor.executeCodingSubmission(
        'def solution(s): return True',
        'python',
        testCases,
        'solution',
        0
      );

      // Assert non-conditionally that the execution summary indicates timeout on all cases
      expect(summary).toBeDefined();
      expect(summary.allPassed).toBe(false);
      expect(summary.results.length).toBe(3);
      expect(summary.results.every((r) => r.status === 'timed_out')).toBe(true);
      expect(summary.results[0].errorMessage).toContain('Overall execution deadline reached');
    });
  });

  describe('2. Mandatory PostgreSQL Advisory Locking', () => {
    it('fails the transaction if transaction client does not support raw query execution', async () => {
      mockPrisma.codingSubmission.findUnique.mockResolvedValue(null);
      mockPrisma.assessment.findFirst.mockResolvedValue({ id: 'assess-1' });

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const clientWithoutRaw = {
          codingSubmission: mockPrisma.codingSubmission,
        };
        return cb(clientWithoutRaw);
      });

      await expect(
        enqueueSubmissionExecution({
          applicationId: 'app-no-raw',
          assessmentId: 'assess-1',
          code: 'def solution(): pass',
          language: 'python',
        })
      ).rejects.toThrow(/does not support raw query execution/);
    });

    it('propagates PostgreSQL advisory lock query failure and fails transaction', async () => {
      mockPrisma.codingSubmission.findUnique.mockResolvedValue(null);
      mockPrisma.assessment.findFirst.mockResolvedValue({ id: 'assess-1' });
      mockPrisma.$queryRawUnsafe.mockRejectedValue(
        new Error('canceling statement due to statement timeout')
      );

      await expect(
        enqueueSubmissionExecution({
          applicationId: 'app-lock-fail',
          assessmentId: 'assess-1',
          code: 'def solution(): pass',
          language: 'python',
        })
      ).rejects.toThrow('canceling statement due to statement timeout');
    });
  });

  describe('3. Concurrency-Safe Application Score Updates Across Workers', () => {
    it('2. Competing workers finalizing concurrently: older attempt cannot overwrite newer score', async () => {
      const actualScoring = await vi.importActual<typeof import('../services/scoring/scoring.service')>(
        '../services/scoring/scoring.service'
      );

      // Simulate Worker B completing Attempt 2 first (score: 95)
      // When Worker A (Attempt 1, score: 60) arrives at scoring service inside the advisory lock:
      mockPrisma.codingSubmission.findFirst.mockResolvedValue({
        attempt_number: 2,
        pass_rate: 95,
      });

      const result = await actualScoring.updateApplicationCodingScore(
        'app-competing-workers',
        60,
        1, // Worker A is attempt 1
        mockPrisma
      );

      // Assert that Worker A did not overwrite Attempt 2's score
      expect(result.score).toBe(95);
      expect(mockPrisma.evaluation.upsert).not.toHaveBeenCalled();
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        'score_app-competing-workers'
      );
    });
  });

  describe('4. BullMQ Reconciliation State Inspection & Recovery', () => {
    it('3. Reconciliation skips queued submissions if BullMQ job is active or waiting', async () => {
      const queuedSub = {
        id: 'sub-active-queue',
        application_id: 'app-1',
        status: 'queued',
        created_at: new Date(Date.now() - 120_000),
        ai_feedback: 'assessment:assess-1',
      };

      mockPrisma.codingSubmission.findMany
        .mockResolvedValueOnce([queuedSub])
        .mockResolvedValueOnce([]);

      mockJobGetState.mockResolvedValueOnce('active');

      const summary = await reconcileStaleQueuedSubmissions(60_000);

      expect(summary.reconciled).toBe(0);
      expect(mockQueueAdd).not.toHaveBeenCalled();
    });

    it('3. Cleans up retained dead BullMQ jobs (completed/failed) and re-enqueues', async () => {
      const queuedSub = {
        id: 'sub-dead-redis-job',
        application_id: 'app-1',
        status: 'queued',
        created_at: new Date(Date.now() - 120_000),
        ai_feedback: 'assessment:assess-1',
      };

      mockPrisma.codingSubmission.findMany
        .mockResolvedValueOnce([queuedSub])
        .mockResolvedValueOnce([]);

      mockJobGetState.mockResolvedValueOnce('completed');
      mockPrisma.assessment.findUnique.mockResolvedValue({
        id: 'assess-1',
        questions: { timer_metadata: { expires_at: new Date(Date.now() + 600_000).toISOString() } },
      });

      const summary = await reconcileStaleQueuedSubmissions(60_000);

      expect(mockJobRemove).toHaveBeenCalled();
      expect(summary.reconciled).toBe(1);
      expect(mockQueueAdd).toHaveBeenCalledWith(
        'evaluate_coding',
        expect.objectContaining({
          submissionId: 'sub-dead-redis-job',
          assessmentId: 'assess-1',
        }),
        expect.anything()
      );
    });

    it('3. BullMQ removal failures do not silently lose the queued submission', async () => {
      const queuedSub = {
        id: 'sub-remove-err',
        application_id: 'app-1',
        status: 'queued',
        created_at: new Date(Date.now() - 120_000),
        ai_feedback: 'assessment:assess-1',
      };

      mockPrisma.codingSubmission.findMany
        .mockResolvedValueOnce([queuedSub])
        .mockResolvedValueOnce([]);

      mockJobGetState.mockResolvedValueOnce('failed');
      mockJobRemove.mockRejectedValueOnce(new Error('Redis command timeout on remove'));

      mockPrisma.assessment.findUnique.mockResolvedValue({
        id: 'assess-1',
        questions: { timer_metadata: { expires_at: new Date(Date.now() + 600_000).toISOString() } },
      });

      // Removal failure was handled gracefully; re-enqueue proceeded
      const summary = await reconcileStaleQueuedSubmissions(60_000);
      expect(summary.reconciled).toBe(1);
    });

    it('3. Competing concurrent reconciliation passes safely coordinate via optimistic lease lock', async () => {
      const runningSub = {
        id: 'sub-expired-running',
        application_id: 'app-1',
        status: 'running',
        runner_version: 'lease:expired-tok:1000',
        created_at: new Date(Date.now() - 120_000),
        ai_feedback: 'assessment:assess-1',
      };

      mockPrisma.codingSubmission.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([runningSub]);

      // Reconciler A claims lease (count: 1); Reconciler B loses race (count: 0)
      mockPrisma.codingSubmission.updateMany.mockResolvedValueOnce({ count: 0 });

      const summary = await reconcileStaleQueuedSubmissions(60_000);
      // Reconciler B skipped re-enqueueing because Reconciler A already claimed it
      expect(summary.reconciled).toBe(0);
      expect(mockQueueAdd).not.toHaveBeenCalled();
    });
  });

  describe('5. Lease Ownership Enforcement & Finalization', () => {
    it('4. Distinguishes claim failure from finalization-time lease loss; aborts without writing results', async () => {
      const submission = {
        id: 'sub-lease-lost',
        application_id: 'app-lease-lost',
        attempt_number: 1,
        status: 'queued',
        code: 'def solution(): return True',
        language: 'python',
        created_at: new Date(),
        ai_feedback: 'assessment:assess-1',
        problem: {
          entry_point: 'solution',
          public_tests: [{ name: 'Test 1', args: [], expected: true }],
        },
      };

      mockPrisma.codingSubmission.findUnique.mockResolvedValue(submission);
      mockPrisma.assessment.findUnique.mockResolvedValue({
        id: 'assess-1',
        questions: { timer_metadata: { expires_at: new Date(Date.now() + 600_000).toISOString() } },
      });

      // Initial claim succeeds (count: 1), but finalization-time check fails (count: 0) because lease was replaced
      mockPrisma.codingSubmission.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      await expect(processSubmissionJob('sub-lease-lost', 'assess-1')).rejects.toThrow(
        /Worker lost lease ownership/
      );

      // Verify no scores or evaluations were written
      expect(mockUpdateApplicationCodingScore).not.toHaveBeenCalled();
      expect(mockPrisma.evaluation.upsert).not.toHaveBeenCalled();
    });

    it('correctly parses lease tokens and timestamps', () => {
      const valid = parseLease('lease:token-xyz:1700000000000');
      expect(valid?.token).toBe('token-xyz');
      expect(valid?.expiresAt).toBe(1700000000000);
      expect(parseLease('invalid-runner-version')).toBeNull();
    });
  });

  describe('6. Worker Lifecycle & Shutdown Hardening', () => {
    it('5. Enforces explicit non-restartable lifecycle contract: reject start() after stop()', async () => {
      const worker = new CodingWorker();
      activeWorkers.push(worker);

      await worker.start();
      expect(worker.getState()).toBe('running');

      await worker.stop();
      expect(worker.getState()).toBe('stopped');

      // Subsequent start call must be rejected
      await expect(worker.start()).rejects.toThrow(
        /CodingWorker has been stopped and cannot be restarted/
      );
    });

    it('5. Concurrent start calls share the exact same in-flight startup promise', async () => {
      const worker = new CodingWorker();
      activeWorkers.push(worker);

      const p1 = worker.start();
      const p2 = worker.start();

      expect(p1).toBe(p2);
      await p1;
      expect(worker.getState()).toBe('running');
    });

    it('5. Concurrent stop calls share the exact same in-flight shutdown promise', async () => {
      const worker = new CodingWorker();
      activeWorkers.push(worker);

      await worker.start();

      const p1 = worker.stop();
      const p2 = worker.stop();

      expect(p1).toBe(p2);
      await p1;
      expect(worker.getState()).toBe('stopped');
    });

    it('5. Worker close failure surfaces error and does NOT close owned Redis prematurely', async () => {
      const mockOwnedRedis = {
        quit: vi.fn().mockResolvedValue('OK'),
        disconnect: vi.fn(),
      } as any;

      const worker = new CodingWorker({
        connection: mockOwnedRedis,
        ownsConnection: true,
      });
      activeWorkers.push(worker);

      await worker.start();

      const internalWorker = worker.getInternalWorker();
      expect(internalWorker).not.toBeNull();
      if (internalWorker) {
        vi.spyOn(internalWorker, 'close').mockRejectedValueOnce(
          new Error('BullMQ close timeout')
        );
      }

      await expect(worker.stop()).rejects.toThrow(/Worker shutdown failed: unable to close BullMQ worker cleanly/);

      // Owned Redis was NOT closed because BullMQ worker failed to shut down cleanly
      expect(mockOwnedRedis.quit).not.toHaveBeenCalled();
    });

    it('5. Redis quit failure falls back to disconnect and surfaces error', async () => {
      const mockOwnedRedis = {
        quit: vi.fn().mockRejectedValue(new Error('Redis quit error')),
        disconnect: vi.fn(),
      } as any;

      const worker = new CodingWorker({
        connection: mockOwnedRedis,
        ownsConnection: true,
      });
      activeWorkers.push(worker);

      await worker.start();

      await expect(worker.stop()).rejects.toThrow(/Redis connection close failed/);
      expect(mockOwnedRedis.disconnect).toHaveBeenCalled();
    });

    it('5. Never closes shared Redis connection when worker does not own it', async () => {
      const mockSharedRedis = {
        quit: vi.fn().mockResolvedValue('OK'),
        disconnect: vi.fn(),
      } as any;

      const worker = new CodingWorker({
        connection: mockSharedRedis,
        ownsConnection: false,
      });
      activeWorkers.push(worker);

      await worker.start();
      await worker.stop();

      expect(mockSharedRedis.quit).not.toHaveBeenCalled();
      expect(mockSharedRedis.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('7. Failed-Event Handling & Retry Semantics', () => {
    it('6. Non-final retry failure does NOT mark submission as errored in database', async () => {
      const worker = new CodingWorker();
      activeWorkers.push(worker);
      await worker.start();

      expect(registeredWorkerFailedHandler).not.toBeNull();

      // Attempt 1 of 3 (retryable)
      await registeredWorkerFailedHandler!(
        {
          id: 'job-retryable-1',
          data: { submissionId: 'sub-retry-1', applicationId: 'app-1', assessmentId: 'assess-1' },
          opts: { attempts: 3 },
          attemptsMade: 1,
        },
        new Error('Transient network error')
      );

      // DB updateMany must NOT have been called for retryable error
      expect(mockPrisma.codingSubmission.updateMany).not.toHaveBeenCalled();
    });

    it('6. UnrecoverableError marks submission as errored even before final attempt', async () => {
      const worker = new CodingWorker();
      activeWorkers.push(worker);
      await worker.start();

      const { UnrecoverableError } = await import('bullmq');
      const unrecoverable = new UnrecoverableError('Test cases missing');

      // Attempt 1 of 3, but unrecoverable
      await registeredWorkerFailedHandler!(
        {
          id: 'job-unrecoverable-1',
          data: { submissionId: 'sub-unrecoverable-1', applicationId: 'app-1', assessmentId: 'assess-1' },
          opts: { attempts: 3 },
          attemptsMade: 1,
        },
        unrecoverable
      );

      expect(mockPrisma.codingSubmission.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'sub-unrecoverable-1',
          status: { notIn: ['passed', 'failed', 'errored'] },
        },
        data: expect.objectContaining({
          status: 'errored',
          error_message: 'Test cases missing',
        }),
      });
    });

    it('6. Stale failed event cannot overwrite newer successful submission', async () => {
      const worker = new CodingWorker();
      activeWorkers.push(worker);
      await worker.start();

      // updateMany returns count: 0 (submission already passed/failed)
      mockPrisma.codingSubmission.updateMany.mockResolvedValueOnce({ count: 0 });

      await registeredWorkerFailedHandler!(
        {
          id: 'job-stale-1',
          data: { submissionId: 'sub-already-passed', applicationId: 'app-1', assessmentId: 'assess-1' },
          opts: { attempts: 3 },
          attemptsMade: 3,
        },
        new Error('Late failure event')
      );

      // Condition status: { notIn: ['passed', 'failed', 'errored'] } ensured safe no-op
      expect(mockPrisma.codingSubmission.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'sub-already-passed',
          status: { notIn: ['passed', 'failed', 'errored'] },
        },
        data: expect.objectContaining({
          status: 'errored',
        }),
      });
    });

    it('6. Database update failure on failed job does not crash the worker', async () => {
      const worker = new CodingWorker();
      activeWorkers.push(worker);
      await worker.start();

      mockPrisma.codingSubmission.updateMany.mockRejectedValueOnce(new Error('DB connection dropped'));

      // Must complete without throwing unhandled rejection
      await expect(
        registeredWorkerFailedHandler!(
          {
            id: 'job-db-err',
            data: { submissionId: 'sub-db-err', applicationId: 'app-1', assessmentId: 'assess-1' },
            opts: { attempts: 3 },
            attemptsMade: 3,
          },
          new Error('Final attempt failure')
        )
      ).resolves.toBeUndefined();
    });
  });
});
