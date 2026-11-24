import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractAssessmentTimer,
  initializeOrResumeTimer,
  DEFAULT_CODING_DURATION_SECONDS,
} from '../services/assessment/assessment-timer.service';

describe('Assessment Timer Service (Phase 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. initializes timer with correct start time, expiry time, and duration', () => {
    const rawAssessment = {
      questions: { title: 'Valid Parentheses' },
      status: 'pending',
    };

    const { timer, wasAlreadyStarted, updatedQuestions } = initializeOrResumeTimer(
      rawAssessment,
      1800
    );

    expect(wasAlreadyStarted).toBe(false);
    expect(timer.isStarted).toBe(true);
    expect(timer.isExpired).toBe(false);
    expect(timer.durationSeconds).toBe(1800);
    expect(timer.timeRemainingSeconds).toBe(1800);
    expect(timer.startedAt).toBeDefined();
    expect(timer.expiresAt).toBeDefined();

    const startedMs = new Date(timer.startedAt!).getTime();
    const expiresMs = new Date(timer.expiresAt!).getTime();
    expect(expiresMs - startedMs).toBe(1800 * 1000);

    const q = updatedQuestions as Record<string, unknown>;
    expect(q.timer_metadata).toBeDefined();
  });

  it('2. resumes active timer correctly without extending or resetting on page refresh', () => {
    const now = Date.now();
    const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString();
    const twentyMinutesAhead = new Date(now + 20 * 60 * 1000).toISOString();

    const activeAssessment = {
      questions: {
        title: 'Two Sum',
        timer_metadata: {
          started_at: tenMinutesAgo,
          expires_at: twentyMinutesAhead,
          duration_seconds: 1800,
          is_started: true,
        },
      },
      status: 'in_progress',
    };

    // First check extraction
    const extracted = extractAssessmentTimer(activeAssessment);
    expect(extracted.isStarted).toBe(true);
    expect(extracted.isExpired).toBe(false);
    // Should have ~20 minutes remaining (1190 - 1200 seconds)
    expect(extracted.timeRemainingSeconds).toBeGreaterThanOrEqual(1190);
    expect(extracted.timeRemainingSeconds).toBeLessThanOrEqual(1200);

    // Call initializeOrResumeTimer (simulating candidate refresh or navigating)
    const resumed = initializeOrResumeTimer(activeAssessment, 1800);
    expect(resumed.wasAlreadyStarted).toBe(true);
    // Timestamps MUST match the original, NOT reset to a fresh 30 minutes!
    expect(resumed.timer.startedAt).toBe(tenMinutesAgo);
    expect(resumed.timer.expiresAt).toBe(twentyMinutesAhead);
  });

  it('3. ensures multiple tabs or concurrent start requests receive identical expiry timestamp', () => {
    const freshAssessment = {
      questions: { title: 'Two Sum' },
      status: 'in_progress',
    };

    // Tab 1 starts assessment:
    const tab1 = initializeOrResumeTimer(freshAssessment, 1800);
    const tab1ExpiresAt = tab1.timer.expiresAt;

    // Assessment record is now updated in DB:
    const updatedDbAssessment = {
      questions: tab1.updatedQuestions,
      status: 'in_progress',
    };

    // Tab 2 opens or starts at the same time:
    const tab2 = initializeOrResumeTimer(updatedDbAssessment, 1800);

    expect(tab2.wasAlreadyStarted).toBe(true);
    expect(tab2.timer.expiresAt).toBe(tab1ExpiresAt);
    expect(tab2.timer.startedAt).toBe(tab1.timer.startedAt);
  });

  it('4. detects expiry accurately and reports zero remaining time', () => {
    const now = Date.now();
    const fortyMinutesAgo = new Date(now - 40 * 60 * 1000).toISOString();
    const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString();

    const expiredAssessment = {
      questions: {
        title: 'Max Subarray',
        timer_metadata: {
          started_at: fortyMinutesAgo,
          expires_at: tenMinutesAgo,
          duration_seconds: 1800,
          is_started: true,
        },
      },
      status: 'in_progress',
    };

    const timer = extractAssessmentTimer(expiredAssessment);
    expect(timer.isStarted).toBe(true);
    expect(timer.isExpired).toBe(true);
    expect(timer.timeRemainingSeconds).toBe(0);
  });

  it('5. handles completed assessments as expired and prevents restart', () => {
    const completedAssessment = {
      questions: { title: 'Valid Parentheses' },
      status: 'completed',
    };

    const timer = extractAssessmentTimer(completedAssessment);
    expect(timer.isExpired).toBe(true);
    expect(timer.timeRemainingSeconds).toBe(0);
  });

  it('6. safely handles legacy / existing assessments without timer metadata', () => {
    const legacyAssessment = {
      questions: {
        title: 'Merge Intervals',
        testCases: [{ input: [1], expected: 1 }],
      },
      status: 'pending',
    };

    const timer = extractAssessmentTimer(legacyAssessment);
    // Not started yet, full duration available, not expired
    expect(timer.isStarted).toBe(false);
    expect(timer.isExpired).toBe(false);
    expect(timer.startedAt).toBeNull();
    expect(timer.expiresAt).toBeNull();
    expect(timer.timeRemainingSeconds).toBe(DEFAULT_CODING_DURATION_SECONDS);
  });

  it('7. safely handles corrupted or unparseable timestamps without crashing', () => {
    const corruptedAssessment = {
      questions: {
        timer_metadata: {
          started_at: 'NOT-A-DATE',
          expires_at: 'INVALID-DATE-STRING',
          duration_seconds: 'invalid-number' as unknown as number,
        },
      },
      status: 'in_progress',
    };

    const timer = extractAssessmentTimer(corruptedAssessment);
    expect(timer.isExpired).toBe(false);
    expect(timer.timeRemainingSeconds).toBe(DEFAULT_CODING_DURATION_SECONDS);
  });
});
