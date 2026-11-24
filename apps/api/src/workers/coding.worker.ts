import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { processSubmissionJob, CodingJobPayload } from '../services/submission/submission-queue.service';
import { logger } from '../lib/logger';
import { prisma } from '@nextround/database';
import { cleanupAllActiveSubprocesses, registerProcessShutdownHandler } from '../services/coding/process-manager';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  enableOfflineQueue: true,
});

redisConnection.on('error', (err: any) => {
  // Suppress ECONNRESET/ECONNREFUSED logs in local dev/testing without active Redis daemon
  if (
    err.code === 'ECONNRESET' ||
    err.code === 'ECONNREFUSED' ||
    err.errors?.some((e: any) => e.code === 'ECONNREFUSED')
  ) {
    return;
  }
  console.error('[Redis CodingWorker] Connection error:', err.message);
});

export interface CodingWorkerOptions {
  connection?: Redis;
  ownsConnection?: boolean;
  concurrency?: number;
}

export type WorkerLifecycleState = 'idle' | 'starting' | 'running' | 'stopping' | 'stopped';

export class CodingWorker {
  private worker: Worker<CodingJobPayload> | null = null;
  private connection: Redis;
  private ownsConnection: boolean;
  private concurrency: number;
  private state: WorkerLifecycleState = 'idle';
  private startPromise: Promise<void> | null = null;
  private stopPromise: Promise<void> | null = null;
  private redisClosed = false;

  constructor(options?: CodingWorkerOptions) {
    this.connection = options?.connection ?? redisConnection;
    this.ownsConnection = options?.ownsConnection ?? false;
    this.concurrency = options?.concurrency ?? 3;
  }

  public getState(): WorkerLifecycleState {
    return this.state;
  }

  /**
   * Starts the background coding worker.
   *
   * Lifecycle Contract:
   * - Non-restartable: Once stopped, subsequent start() calls reject immediately.
   * - Concurrent start() calls share the exact in-flight startup promise.
   * - If called while stopping, waits for stop to complete and rejects.
   */
  public start(): Promise<void> {
    if (this.startPromise) {
      return this.startPromise;
    }
    if (this.state === 'running') {
      return Promise.resolve();
    }
    if (this.state === 'stopped') {
      return Promise.reject(
        new Error('CodingWorker has been stopped and cannot be restarted. Create a new CodingWorker instance.')
      );
    }
    if (this.state === 'stopping' && this.stopPromise) {
      return this.stopPromise.then(() => {
        return Promise.reject(
          new Error('CodingWorker has been stopped and cannot be restarted. Create a new CodingWorker instance.')
        );
      });
    }

    this.state = 'starting';

    this.startPromise = (async () => {
      // Register OS process signal handler that triggers full worker shutdown
      registerProcessShutdownHandler(async () => {
        await this.stop();
      });

      this.worker = new Worker<CodingJobPayload>(
        'coding',
        async (job: Job<CodingJobPayload>) => {
          const { submissionId, applicationId, assessmentId } = job.data;
          const attempt = job.attemptsMade + 1;
          const maxAttempts = job.opts.attempts || 3;

          logger.child('CodingWorker').info(
            `Processing coding job #${job.id} for submission ${submissionId} (app: ${applicationId}, attempt ${attempt}/${maxAttempts})`
          );

          return await processSubmissionJob(submissionId, assessmentId);
        },
        {
          connection: this.connection,
          concurrency: this.concurrency,
        }
      );

      this.worker.on('completed', (job) => {
        logger.child('CodingWorker').info(
          `Coding job #${job.id} (submission ${job.data.submissionId}) completed successfully.`
        );
      });

      this.worker.on('failed', async (job, err) => {
        if (!job) return;
        const attemptsLimit = job.opts.attempts || 3;
        // In BullMQ, attemptsMade is the total number of attempts made so far
        const isFinalAttempt = job.attemptsMade >= attemptsLimit;
        const isUnrecoverable = err?.name === 'UnrecoverableError';

        logger.child('CodingWorker').error(
          `Coding job #${job.id} (submission ${job.data.submissionId}) failed on attempt ${job.attemptsMade}/${attemptsLimit}: ${err.message}`
        );

        // Distinguish retryable failures from final/unrecoverable failures:
        // Only mark the submission as 'errored' in the database when unrecoverable or retries are exhausted.
        if (!isFinalAttempt && !isUnrecoverable) {
          logger.child('CodingWorker').info(
            `Submission ${job.data.submissionId} failed attempt ${job.attemptsMade} and will be retried by BullMQ.`
          );
          return;
        }

        try {
          // Atomic conditional update: only update if current status is NOT passed, failed, or already errored.
          // Guarantees no race condition can overwrite terminal results.
          const result = await prisma.codingSubmission.updateMany({
            where: {
              id: job.data.submissionId,
              status: { notIn: ['passed', 'failed', 'errored'] },
            },
            data: {
              status: 'errored',
              error_message: isUnrecoverable
                ? err.message
                : `Worker execution exhausted ${attemptsLimit} retry attempts: ${err.message}`,
            },
          });

          if (result.count === 0) {
            logger.child('CodingWorker').warn(
              `Submission ${job.data.submissionId} was already in a terminal state (passed, failed, errored) or not found; skipped errored update.`
            );
          } else {
            logger.child('CodingWorker').warn(
              `Submission ${job.data.submissionId} marked as 'errored' following ${isUnrecoverable ? 'unrecoverable error' : 'BullMQ retry exhaustion'}.`
            );
          }
        } catch (dbErr) {
          logger.child('CodingWorker').error(
            `Failed to mark submission ${job.data.submissionId} as errored in database:`,
            dbErr
          );
        }
      });

      this.state = 'running';
      logger.child('CodingWorker').info('Coding background worker started on queue coding.');
    })().finally(() => {
      this.startPromise = null;
    });

    return this.startPromise;
  }

  /**
   * Gracefully shuts down the worker.
   *
   * Ordered Shutdown:
   * 1. Closes BullMQ worker (stops receiving jobs and awaits active jobs).
   * 2. Cleans up all active subprocesses.
   3. Closes owned Redis connection (if owned by this worker). Never closes shared connection.
   *
   * If worker.close() fails, error is logged and surfaced, and owned Redis is NOT closed prematurely.
   */
  public stop(): Promise<void> {
    if (this.state === 'stopped') {
      return Promise.resolve();
    }
    if (this.state === 'stopping' && this.stopPromise) {
      return this.stopPromise;
    }
    if (this.state === 'idle') {
      this.state = 'stopped';
      return Promise.resolve();
    }

    const previousState = this.state;
    this.state = 'stopping';

    this.stopPromise = (async () => {
      // If startup is currently in flight, await it before proceeding with shutdown
      if (previousState === 'starting' && this.startPromise) {
        try {
          await this.startPromise;
        } catch {}
      }

      // 1. Close BullMQ worker safely
      if (this.worker) {
        try {
          await this.worker.close();
          this.worker = null;
        } catch (closeErr: any) {
          logger.child('CodingWorker').error('Failed to close BullMQ worker during shutdown:', closeErr);
          // Do not proceed to close Redis or mark clean stop if worker failed to close
          throw new Error(`Worker shutdown failed: unable to close BullMQ worker cleanly: ${closeErr.message}`);
        }
      }

      // 2. Clean up any active in-flight subprocesses across the runtime
      await cleanupAllActiveSubprocesses();

      // 3. Close Redis connection if owned by this worker (exactly once)
      if (this.ownsConnection && !this.redisClosed && this.connection) {
        this.redisClosed = true;
        try {
          await this.connection.quit();
        } catch (quitErr: any) {
          logger.child('CodingWorker').warn('Redis quit failed, forcing disconnect:', quitErr);
          try {
            this.connection.disconnect();
          } catch {}
          throw new Error(`Redis connection close failed: ${quitErr.message}`);
        }
      }

      this.state = 'stopped';
      logger.child('CodingWorker').info('Coding background worker stopped gracefully.');
    })().finally(() => {
      this.stopPromise = null;
    });

    return this.stopPromise;
  }

  public getInternalWorker(): Worker<CodingJobPayload> | null {
    return this.worker;
  }
}

export const codingWorker = new CodingWorker();
