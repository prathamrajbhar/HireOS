import { Prisma } from '@nextround/database';

export interface AssessmentTimerState {
  startedAt: string | null;
  expiresAt: string | null;
  durationSeconds: number;
  timeRemainingSeconds: number;
  isStarted: boolean;
  isExpired: boolean;
}

export const DEFAULT_CODING_DURATION_SECONDS = 1800; // 30 minutes

interface AssessmentLike {
  questions?: unknown;
  responses?: unknown;
  status?: string;
  created_at?: Date;
  started_at?: Date | null;
  expires_at?: Date | null;
}

/**
 * Extracts the timer state from an assessment record.
 * Supports direct DateTime columns if present, and falls back to JSON timer_metadata
 * for backward compatibility before migrations are applied.
 */
export function extractAssessmentTimer(
  assessment: AssessmentLike,
  fallbackDuration: number = DEFAULT_CODING_DURATION_SECONDS
): AssessmentTimerState {
  // 1. Direct schema column values if present
  const directStarted = assessment.started_at
    ? new Date(assessment.started_at).toISOString()
    : null;
  const directExpires = assessment.expires_at
    ? new Date(assessment.expires_at).toISOString()
    : null;

  // 2. Fallback to timer_metadata stored inside JSON fields
  const qObj =
    assessment.questions && typeof assessment.questions === 'object'
      ? (assessment.questions as Record<string, unknown>)
      : {};
  const rObj =
    assessment.responses && typeof assessment.responses === 'object'
      ? (assessment.responses as Record<string, unknown>)
      : {};

  const timerMeta = (qObj.timer_metadata || rObj.timer_metadata || {}) as Record<
    string,
    unknown
  >;

  const startedAt =
    directStarted ||
    (typeof timerMeta.started_at === 'string' ? timerMeta.started_at : null);
  const expiresAt =
    directExpires ||
    (typeof timerMeta.expires_at === 'string' ? timerMeta.expires_at : null);
  const durationSeconds =
    typeof timerMeta.duration_seconds === 'number'
      ? timerMeta.duration_seconds
      : fallbackDuration;

  const nowMs = Date.now();
  let timeRemainingSeconds = durationSeconds;
  let isStarted = Boolean(startedAt);
  let isExpired = false;

  if (expiresAt) {
    const expiresMs = new Date(expiresAt).getTime();
    if (isNaN(expiresMs)) {
      timeRemainingSeconds = durationSeconds;
    } else {
      const diffSec = Math.floor((expiresMs - nowMs) / 1000);
      timeRemainingSeconds = Math.max(0, diffSec);
      isExpired = nowMs >= expiresMs;
    }
  }

  // If already completed in database, mark expired and zero out remaining time
  if (assessment.status === 'completed') {
    isExpired = true;
    timeRemainingSeconds = 0;
  }

  return {
    startedAt,
    expiresAt,
    durationSeconds,
    timeRemainingSeconds,
    isStarted,
    isExpired,
  };
}

/**
 * Starts the timer for an assessment idempotently.
 * If the timer is already active, preserves the existing timestamps so refreshing,
 * navigating, or duplicate requests cannot extend the assessment.
 */
export function initializeOrResumeTimer(
  assessment: AssessmentLike,
  durationSeconds: number = DEFAULT_CODING_DURATION_SECONDS
): {
  updatedQuestions: Prisma.InputJsonValue;
  timer: AssessmentTimerState;
  wasAlreadyStarted: boolean;
} {
  const currentTimer = extractAssessmentTimer(assessment, durationSeconds);

  const qObj =
    assessment.questions && typeof assessment.questions === 'object'
      ? { ...(assessment.questions as Record<string, unknown>) }
      : {};

  // Idempotency: if already started, preserve existing start and expiry times
  if (currentTimer.isStarted && currentTimer.startedAt && currentTimer.expiresAt) {
    return {
      updatedQuestions: qObj as unknown as Prisma.InputJsonValue,
      timer: currentTimer,
      wasAlreadyStarted: true,
    };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationSeconds * 1000);

  const timerMetadata = {
    started_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    duration_seconds: durationSeconds,
    is_started: true,
  };

  qObj.timer_metadata = timerMetadata;

  const timer: AssessmentTimerState = {
    startedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    durationSeconds,
    timeRemainingSeconds: durationSeconds,
    isStarted: true,
    isExpired: false,
  };

  return {
    updatedQuestions: qObj as unknown as Prisma.InputJsonValue,
    timer,
    wasAlreadyStarted: false,
  };
}
