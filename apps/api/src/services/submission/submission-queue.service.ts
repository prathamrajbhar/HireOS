import { prisma, Prisma } from '@nextround/database';
import { UnrecoverableError } from 'bullmq';
import { executeCodingSubmission, normalizeTestCases, TestCaseInput } from '../coding/coding-executor.service';
import { updateApplicationCodingScore } from '../scoring/scoring.service';
import { extractAssessmentTimer } from '../assessment/assessment-timer.service';
import { getQueue, JOB_NAMES, DEFAULT_JOB_OPTIONS } from '../../lib/bullmq';
import { logger } from '../../lib/logger';
import crypto from 'crypto';

export interface CreateSubmissionInput {
  applicationId: string;
  problemId?: string;
  assessmentId?: string;
  code: string;
  language: string;
  idempotencyKey?: string;
}

export interface CodingJobPayload {
  submissionId: string;
  applicationId: string;
  problemId?: string;
  assessmentId?: string;
  enqueuedAt: string;
}

export const LEASE_TIMEOUT_MS = 60_000; // 60 seconds lease for worker execution
export const MAX_EXECUTION_TIME_MS = 30_000; // Strict cap on overall execution duration

export interface SubmissionLease {
  token: string;
  expiresAt: number;
}

export function parseLease(runnerVersion: string | null | undefined): SubmissionLease | null {
  if (!runnerVersion || !runnerVersion.startsWith('lease:')) {
    return null;
  }
  const parts = runnerVersion.split(':');
  if (parts.length >= 3) {
    const token = parts[1];
    const expiresAt = parseInt(parts[2], 10);
    if (token && !isNaN(expiresAt)) {
      return { token, expiresAt };
    }
  }
  return null;
}

export function createLeaseString(token: string, expiresAtMs: number): string {
  return `lease:${token}:${expiresAtMs}`;
}

export function formatAssessmentTag(assessmentId: string | undefined): string | null {
  return assessmentId ? `assessment:${assessmentId}` : null;
}

export function extractStoredAssessmentId(aiFeedback: string | null | undefined): string | null {
  if (!aiFeedback) return null;
  const match = aiFeedback.match(/assessment:([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// In-process lock map to prevent attempt allocation race conditions within the same API node
const appLocks = new Map<string, Promise<void>>();
async function withAppLock<T>(appId: string, fn: () => Promise<T>): Promise<T> {
  while (appLocks.has(appId)) {
    try {
      await appLocks.get(appId);
    } catch {
      // Ignore previous lock failures
    }
  }

  let release: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    release = resolve;
  });
  appLocks.set(appId, lockPromise);

  try {
    return await fn();
  } finally {
    appLocks.delete(appId);
    release!();
  }
}

export async function enqueueSubmissionExecution(input: CreateSubmissionInput) {
  const idempotencyKey = input.idempotencyKey || `sub_${crypto.randomUUID()}`;

  // 1. Fast check for existing submission by idempotency key
  let existing = await prisma.codingSubmission.findUnique({
    where: { idempotency_key: idempotencyKey },
  });

  if (existing) {
    // If the submission is already terminal, verify score persistence before returning
    if (existing.status === 'passed' || existing.status === 'failed') {
      if (existing.application_id) {
        await updateApplicationCodingScore(
          existing.application_id,
          existing.pass_rate,
          existing.attempt_number
        ).catch((err) => {
          logger.child('SubmissionQueue').warn(
            `Failed to ensure score persistence for idempotency hit ${existing!.id}:`,
            err
          );
        });
      }
      return existing;
    }

    // Preserve authorizing assessment association across idempotency recovery
    const recoveredAssessmentId = input.assessmentId || extractStoredAssessmentId(existing.ai_feedback);

    // If the submission is queued or previously errored during dispatch, verify BullMQ job existence and state
    try {
      const queue = getQueue('coding');
      const existingJob = await queue.getJob(`coding_${existing.id}`).catch(() => null);
      let isJobActiveOrWaiting = false;

      if (existingJob) {
        const state = await existingJob.getState().catch(() => 'unknown');
        if (state === 'active' || state === 'waiting' || state === 'delayed' || state === 'prioritized') {
          isJobActiveOrWaiting = true;
        } else if (state === 'completed' || state === 'failed') {
          // Stale/retained dead job in Redis: clean up so a fresh job can be enqueued
          await existingJob.remove().catch(() => {});
          isJobActiveOrWaiting = false;
        }
      }

      if (!isJobActiveOrWaiting) {
        // Recover missing job: dispatch to BullMQ now with preserved assessmentId
        await queue.add(
          JOB_NAMES.coding,
          {
            submissionId: existing.id,
            applicationId: existing.application_id || input.applicationId,
            problemId: existing.problem_id || input.problemId,
            assessmentId: recoveredAssessmentId || undefined,
            enqueuedAt: new Date().toISOString(),
          } satisfies CodingJobPayload,
          {
            jobId: `coding_${existing.id}`,
            ...DEFAULT_JOB_OPTIONS,
          }
        );

        if (existing.status === 'errored') {
          existing = await prisma.codingSubmission.update({
            where: { id: existing.id },
            data: { status: 'queued', error_message: null },
          });
        }
        logger.child('SubmissionQueue').info(
          `Dispatched missing/recovered BullMQ job for existing submission ${existing.id}`
        );
      }
    } catch (jobCheckErr) {
      logger.child('SubmissionQueue').warn(
        `Could not verify BullMQ job for existing submission ${existing.id}:`,
        jobCheckErr
      );
    }

    return existing;
  }

  // Explicitly associate authorizing assessment at creation time to prevent subsequent drift
  if (!input.assessmentId && input.applicationId) {
    const activeAssessment = await prisma.assessment.findFirst({
      where: { application_id: input.applicationId, test_type: 'coding' },
      orderBy: { created_at: 'desc' },
      select: { id: true },
    });
    if (activeAssessment) {
      input.assessmentId = activeAssessment.id;
    }
  }

  const codeHash = crypto.createHash('sha256').update(input.code).digest('hex');
  const assessmentTag = formatAssessmentTag(input.assessmentId);

  // 2. Concurrency-safe attempt allocation with mandatory PostgreSQL advisory locking
  let submission: any;
  submission = await withAppLock(input.applicationId, async () => {
    let lastError: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await prisma.$transaction(async (tx) => {
          // Mandatory transaction-scoped PostgreSQL advisory lock using $queryRawUnsafe (SELECT query).
          // Fail the transaction if the client does not support raw query execution. Do not skip or swallow errors.
          if (typeof (tx as any).$queryRawUnsafe !== 'function') {
            throw new Error(
              'Transaction client does not support raw query execution required for PostgreSQL advisory lock.'
            );
          }
          await (tx as any).$queryRawUnsafe(
            'SELECT pg_advisory_xact_lock(hashtext($1))',
            input.applicationId
          );

          // Query current highest attempt for this application
          const latestSubmission = await tx.codingSubmission.findFirst({
            where: { application_id: input.applicationId },
            orderBy: { attempt_number: 'desc' },
            select: { attempt_number: true },
          });
          const attemptNumber = (latestSubmission?.attempt_number ?? 0) + 1;

          return await tx.codingSubmission.create({
            data: {
              application_id: input.applicationId,
              problem_id: input.problemId,
              attempt_number: attemptNumber,
              idempotency_key: idempotencyKey,
              language: input.language,
              code: input.code,
              code_hash: codeHash,
              status: 'queued',
              ai_feedback: assessmentTag, // Durably persist authorizing assessment association
              test_results: [],
              pass_rate: 0,
              pass_rate_percent: 0,
              pass_rate_ratio: 0,
            },
          });
        });
      } catch (err: any) {
        lastError = err;
        // Handle race conditions on idempotency key
        if (err?.code === 'P2002' || err?.message?.includes('idempotency_key')) {
          const concurrentExisting = await prisma.codingSubmission.findUnique({
            where: { idempotency_key: idempotencyKey },
          });
          if (concurrentExisting) {
            return concurrentExisting;
          }
        }
      }
    }
    throw lastError;
  });

  // If a concurrent race returned an already persisted submission
  if (submission.status !== 'queued') {
    return submission;
  }

  // 3. Dispatch to BullMQ 'coding' queue with ambiguous failure protection
  const queue = getQueue('coding');
  const jobId = `coding_${submission.id}`;

  try {
    await queue.add(
      JOB_NAMES.coding,
      {
        submissionId: submission.id,
        applicationId: input.applicationId,
        problemId: input.problemId,
        assessmentId: input.assessmentId,
        enqueuedAt: new Date().toISOString(),
      } satisfies CodingJobPayload,
      {
        jobId,
        ...DEFAULT_JOB_OPTIONS,
      }
    );
    logger.child('SubmissionQueue').info(`Enqueued submission ${submission.id} to BullMQ coding queue`);
  } catch (queueErr) {
    logger.child('SubmissionQueue').error(`Dispatch error for submission ${submission.id}:`, queueErr);

    // Verify whether the job was actually enqueued in Redis despite the error
    let successfullyEnqueued = false;
    try {
      const confirmedJob = await queue.getJob(jobId);
      if (confirmedJob) {
        successfullyEnqueued = true;
      }
    } catch {
      // Ignore lookup failure
    }

    if (!successfullyEnqueued) {
      await prisma.codingSubmission
        .update({
          where: { id: submission.id },
          data: {
            status: 'errored',
            error_message: 'Failed to dispatch submission to execution queue',
          },
        })
        .catch((updateErr) => {
          logger.child('SubmissionQueue').error(`Failed to mark submission ${submission.id} as errored:`, updateErr);
        });
      throw queueErr;
    }
  }

  return submission;
}

export async function processSubmissionJob(submissionId: string, assessmentId?: string) {
  // 1. Load submission with problem and application
  const submission = await prisma.codingSubmission.findUnique({
    where: { id: submissionId },
    include: { problem: true },
  });

  if (!submission) {
    throw new UnrecoverableError(`Submission ${submissionId} not found in database.`);
  }

  // 2. Terminal state check: durable score persistence & skip execution
  if (submission.status === 'passed' || submission.status === 'failed') {
    logger.child('SubmissionQueue').info(
      `Submission ${submissionId} has reached terminal status ${submission.status}. Ensuring score persistence.`
    );
    if (submission.application_id) {
      await updateApplicationCodingScore(
        submission.application_id,
        submission.pass_rate,
        submission.attempt_number
      );
    }
    return submission;
  }

  if (submission.status === 'errored') {
    logger.child('SubmissionQueue').info(
      `Submission ${submissionId} is already marked errored. Skipping execution.`
    );
    return submission;
  }

  // 3. Assessment Resolution & Server-Side Timer Enforcement
  // Must preserve authorizing assessment association without silent fallback
  if (submission.application_id) {
    const targetAssessmentId = assessmentId || extractStoredAssessmentId(submission.ai_feedback);

    if (!targetAssessmentId) {
      await prisma.codingSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'errored',
          error_message: `Submission ${submissionId} has no authorizing assessment associated.`,
        },
      });
      throw new UnrecoverableError(
        `Submission ${submissionId} has no authorizing assessment associated.`
      );
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: targetAssessmentId },
    });

    if (!assessment) {
      await prisma.codingSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'errored',
          error_message: `Authorizing assessment ${targetAssessmentId} not found in database.`,
        },
      });
      throw new UnrecoverableError(
        `Authorizing assessment ${targetAssessmentId} not found in database.`
      );
    }

    const timer = extractAssessmentTimer(assessment);
    if (timer.expiresAt) {
      const acceptedTimeMs = new Date(submission.created_at).getTime();
      const expiresAtMs = new Date(timer.expiresAt).getTime();
      if (!isNaN(expiresAtMs) && acceptedTimeMs > expiresAtMs) {
        // Permanent failure: submission was accepted after deadline
        await prisma.codingSubmission.update({
          where: { id: submissionId },
          data: {
            status: 'errored',
            error_message: 'Submission was created after assessment deadline',
          },
        });
        throw new UnrecoverableError(`Submission ${submissionId} was accepted after assessment deadline`);
      }
    }
  }

  // 4. Execution Lease Claim & Stale Running Worker Recovery
  const now = Date.now();
  const workerLeaseToken = crypto.randomUUID();
  const newLeaseExpiresAt = now + LEASE_TIMEOUT_MS;
  const newLeaseStr = createLeaseString(workerLeaseToken, newLeaseExpiresAt);

  if (submission.status === 'queued') {
    // Atomic transition from queued -> running with worker lease
    const claimResult = await prisma.codingSubmission.updateMany({
      where: { id: submissionId, status: 'queued' },
      data: { status: 'running', runner_version: newLeaseStr },
    });

    if (claimResult.count === 0) {
      const current = await prisma.codingSubmission.findUnique({
        where: { id: submissionId },
        include: { problem: true },
      });
      if (current?.status === 'passed' || current?.status === 'failed') {
        if (current.application_id) {
          await updateApplicationCodingScore(current.application_id, current.pass_rate, current.attempt_number);
        }
        return current;
      }
      throw new Error(`Worker failed to atomically claim queued submission ${submissionId}`);
    }
  } else if (submission.status === 'running') {
    // Check if the current lease is active or expired (worker crash recovery)
    const existingLease = parseLease(submission.runner_version);
    if (existingLease && now < existingLease.expiresAt) {
      // Active lease owned by another worker: do not execute, retry later
      throw new Error(
        `Submission ${submissionId} is currently being executed under active lease ${existingLease.token} (expires in ${existingLease.expiresAt - now}ms)`
      );
    }

    // Lease has expired or is invalid: previous worker crashed or stalled. Reclaim lease.
    const reclaimResult = await prisma.codingSubmission.updateMany({
      where: {
        id: submissionId,
        status: 'running',
        runner_version: submission.runner_version,
      },
      data: { runner_version: newLeaseStr },
    });

    if (reclaimResult.count === 0) {
      throw new Error(`Concurrent lease reclaim collision for submission ${submissionId}`);
    }

    logger.child('SubmissionQueue').warn(
      `Reclaimed stale running lease for submission ${submissionId} (expired lease: ${existingLease?.token || 'unknown'})`
    );
  }

  // 5. Load and normalize test cases
  let testCases: TestCaseInput[] = [];
  let entryPoint = 'solution';

  if (submission.problem) {
    entryPoint = submission.problem.entry_point || 'solution';
    const publicTests = normalizeTestCases(submission.problem.public_tests, { defaultHidden: false });
    const hiddenTests = normalizeTestCases(submission.problem.hidden_tests, { defaultHidden: true });
    testCases = [...publicTests, ...hiddenTests];
  }

  if (testCases.length === 0) {
    await prisma.codingSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'errored',
        error_message: `Coding problem ${submission.problem_id || ''} has no configured test cases.`,
      },
    });
    throw new UnrecoverableError(`Coding problem ${submission.problem_id || ''} has no configured test cases.`);
  }

  // 6. Execute candidate solution inside sandbox with strict overall execution deadline
  const summary = await executeCodingSubmission(
    submission.code,
    submission.language,
    testCases,
    entryPoint,
    MAX_EXECUTION_TIME_MS
  );

  const finalStatus = summary.allPassed ? 'passed' : 'failed';

  // 7. Atomic transaction: Verify exact lease ownership, save test results, and update application coding score
  // Strict transaction integrity: NO fallback to global prisma client
  const updated = await prisma.$transaction(async (tx) => {
    // Atomically verify that this worker STILL owns the lease before finalizing
    const claimCheck = await tx.codingSubmission.updateMany({
      where: {
        id: submissionId,
        status: 'running',
        runner_version: newLeaseStr, // Must match this worker's active lease token exactly!
      },
      data: {
        status: finalStatus,
        test_results: summary.results as unknown as Prisma.InputJsonValue,
        pass_rate: summary.passRate,
        pass_rate_percent: summary.passRate,
        pass_rate_ratio: summary.passRateRatio,
        execution_time_ms: Math.round(summary.totalTimeMs),
        memory_kb: summary.memoryKb ?? null,
        runner_version: summary.runnerVersion,
        stdout_stderr: summary.logs.join('\n'),
        completed_at: new Date(),
      },
    });

    if (claimCheck.count === 0) {
      throw new Error(
        `Worker lost lease ownership for submission ${submissionId} (lease expired or replaced). Aborting finalization.`
      );
    }

    if (submission.application_id) {
      await updateApplicationCodingScore(
        submission.application_id,
        summary.passRate,
        submission.attempt_number,
        tx
      );
    }

    return tx.codingSubmission.findUnique({
      where: { id: submissionId },
    });
  });

  return updated;
}

/**
 * Reconciles submissions that are stuck in 'queued' or have expired 'running' leases.
 * Multi-instance safe: inspects BullMQ job state, cleans up retained completed/failed jobs,
 * and recovers jobs after Redis/queue-add failures.
 */
export async function reconcileStaleQueuedSubmissions(staleAgeMs: number = 60_000) {
  const cutoff = new Date(Date.now() - staleAgeMs);

  // Find queued submissions older than cutoff
  const staleQueued = await prisma.codingSubmission.findMany({
    where: {
      status: 'queued',
      created_at: { lt: cutoff },
    },
    take: 50,
  });

  // Find running submissions older than cutoff
  const staleRunning = await prisma.codingSubmission.findMany({
    where: {
      status: 'running',
      created_at: { lt: cutoff },
    },
    take: 50,
  });

  const now = Date.now();
  const summary = { reconciled: 0, expired: 0, errors: 0 };
  const queue = getQueue('coding');

  // 1. Process stale running submissions whose lease has genuinely expired
  for (const runningSub of staleRunning) {
    const lease = parseLease(runningSub.runner_version);
    // If lease is active, DO NOT INTERFERE with active execution
    if (lease && now < lease.expiresAt) {
      continue;
    }

    try {
      // Atomically reset expired running submission back to 'queued' using optimistic lock on expired lease
      const claim = await prisma.codingSubmission.updateMany({
        where: {
          id: runningSub.id,
          status: 'running',
          runner_version: runningSub.runner_version,
        },
        data: {
          status: 'queued',
          runner_version: null,
        },
      });

      if (claim.count === 0) {
        // Another reconciler or worker claimed/finalized it
        continue;
      }

      const storedAssessmentId = extractStoredAssessmentId(runningSub.ai_feedback);
      await queue.add(
        JOB_NAMES.coding,
        {
          submissionId: runningSub.id,
          applicationId: runningSub.application_id || '',
          problemId: runningSub.problem_id || undefined,
          assessmentId: storedAssessmentId || undefined,
          enqueuedAt: new Date().toISOString(),
        } satisfies CodingJobPayload,
        {
          jobId: `coding_${runningSub.id}`,
          ...DEFAULT_JOB_OPTIONS,
        }
      );
      summary.reconciled++;
    } catch (err) {
      logger.child('SubmissionQueue').error(`Failed to reconcile running submission ${runningSub.id}:`, err);
      summary.errors++;
    }
  }

  // 2. Process stale queued submissions by inspecting BullMQ job state
  for (const queuedSub of staleQueued) {
    try {
      const existingJob = await queue.getJob(`coding_${queuedSub.id}`).catch(() => null);
      let isJobActiveOrWaiting = false;

      if (existingJob) {
        const state = await existingJob.getState().catch(() => 'unknown');
        if (state === 'active' || state === 'waiting' || state === 'delayed' || state === 'prioritized') {
          // Job is genuinely alive and processing/queued in BullMQ
          isJobActiveOrWaiting = true;
        } else if (state === 'completed' || state === 'failed') {
          // Retained dead job in Redis: clean it up so a new job can be dispatched
          await existingJob.remove().catch(() => {});
          isJobActiveOrWaiting = false;
        }
      }

      if (isJobActiveOrWaiting) {
        // Do not touch active or waiting jobs
        continue;
      }

      let isExpired = false;
      const targetAssessmentId = extractStoredAssessmentId(queuedSub.ai_feedback);

      if (queuedSub.application_id && targetAssessmentId) {
        const assessment = await prisma.assessment.findUnique({
          where: { id: targetAssessmentId },
        });

        if (assessment) {
          const timer = extractAssessmentTimer(assessment);
          if (timer.expiresAt) {
            const acceptedTimeMs = new Date(queuedSub.created_at).getTime();
            const expiresAtMs = new Date(timer.expiresAt).getTime();
            if (!isNaN(expiresAtMs) && acceptedTimeMs > expiresAtMs) {
              isExpired = true;
            }
          }
        }
      }

      if (isExpired) {
        await prisma.codingSubmission.update({
          where: { id: queuedSub.id },
          data: {
            status: 'errored',
            error_message: 'Reconciliation found submission created after assessment deadline',
          },
        });
        summary.expired++;
      } else {
        await queue.add(
          JOB_NAMES.coding,
          {
            submissionId: queuedSub.id,
            applicationId: queuedSub.application_id || '',
            problemId: queuedSub.problem_id || undefined,
            assessmentId: targetAssessmentId || undefined,
            enqueuedAt: new Date().toISOString(),
          } satisfies CodingJobPayload,
          {
            jobId: `coding_${queuedSub.id}`,
            ...DEFAULT_JOB_OPTIONS,
          }
        );
        summary.reconciled++;
      }
    } catch (err) {
      logger.child('SubmissionQueue').error(`Failed to reconcile queued submission ${queuedSub.id}:`, err);
      summary.errors++;
    }
  }

  return summary;
}

/**
 * Reconciles completed submissions whose application scores may be missing or unsynced.
 */
export async function reconcileMissingScores() {
  const completedSubmissions = await prisma.codingSubmission.findMany({
    where: {
      status: { in: ['passed', 'failed'] },
      application_id: { not: null },
    },
    orderBy: { created_at: 'desc' },
    take: 100,
  });

  let synced = 0;
  for (const sub of completedSubmissions) {
    if (sub.application_id) {
      try {
        await updateApplicationCodingScore(
          sub.application_id,
          sub.pass_rate,
          sub.attempt_number
        );
        synced++;
      } catch (err) {
        logger.child('SubmissionQueue').warn(`Score sync failed for submission ${sub.id}:`, err);
      }
    }
  }
  return { synced };
}
