import { describe, expect, it } from 'vitest';
import type { Application } from '@/types';
import { buildApplicationStages } from './applicationStages';

const base = { appliedDate: '2026-01-01' } as Application;
const app = (over: Partial<Application>): Application => ({ ...base, status: 'applied', ...over }) as Application;
const state = (stages: ReturnType<typeof buildApplicationStages>) =>
  Object.fromEntries(stages.map((s) => [s.key, s.failed ? 'failed' : s.done ? 'done' : 'pending']));

describe('buildApplicationStages', () => {
  it('marks only Applied done for a fresh application', () => {
    expect(state(buildApplicationStages(app({})))).toEqual({
      applied: 'done', screening: 'pending', assessment: 'pending',
      interview: 'pending', hr_round: 'pending', decision: 'pending',
    });
  });

  it('marks stages up to the current status done', () => {
    const s = state(buildApplicationStages(app({ status: 'hr_round' })));
    expect(s).toMatchObject({ screening: 'done', assessment: 'done', interview: 'done', hr_round: 'pending', decision: 'pending' });
  });

  it.each([
    ['screening', { screening: 'failed', assessment: 'pending', decision: 'pending' }],
    ['assessment', { screening: 'done', assessment: 'failed', interview: 'pending', decision: 'pending' }],
    ['interview', { assessment: 'done', interview: 'failed', hr_round: 'pending', decision: 'pending' }],
    ['hr_round', { interview: 'done', hr_round: 'failed', decision: 'pending' }],
    ['decision', { hr_round: 'done', decision: 'failed' }],
  ] as const)('shows rejection at %s as failed, never complete', (failedStage, expected) => {
    const s = state(buildApplicationStages(app({ status: 'rejected', failedStage })));
    expect(s).toMatchObject(expected);
  });

  it('does not mark a failed-but-completed assessment as done', () => {
    const assessments = [{ category: 'aptitude', status: 'completed', assessmentName: 'Aptitude' }] as never;
    const s = state(buildApplicationStages(app({ status: 'rejected', failedStage: 'assessment' }), null, assessments));
    expect(s.assessment).toBe('failed');
  });

  it('falls back to failing only Decision when the failed stage is unknown', () => {
    const s = state(buildApplicationStages(app({ status: 'rejected' })));
    expect(s.decision).toBe('failed');
    expect(s.applied).toBe('done');
  });

  it('respects job stage configuration', () => {
    const job = { stages: ['screening'] } as never;
    const keys = buildApplicationStages(app({}), job).map((s) => s.key);
    expect(keys).toEqual(['applied', 'screening', 'decision']);
  });
});
