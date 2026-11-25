import { describe, expect, it } from 'vitest';
import { resolveFailedStage } from '../lib/failed-stage';

describe('resolveFailedStage', () => {
  it('returns undefined unless the application is rejected', () => {
    expect(resolveFailedStage('assessment', null, 'assessment')).toBeUndefined();
    expect(resolveFailedStage('hr_round', 'failed', 'hr_round')).toBeUndefined();
  });

  it.each([
    ['screening', 'screening'],
    ['assessment', 'assessment'],
    ['coding', 'assessment'],
    ['interview', 'interview'],
    ['hr_round', 'hr_round'],
    ['final_evaluation', 'decision'],
  ])('maps evaluation stage %s to %s', (evalStage, expected) => {
    expect(resolveFailedStage('rejected', null, evalStage)).toBe(expected);
  });

  it('prefers a failed HR round', () => {
    expect(resolveFailedStage('rejected', 'failed', 'interview')).toBe('hr_round');
  });

  it('returns undefined for unknown or missing evaluation stage', () => {
    expect(resolveFailedStage('rejected', null, 'weird')).toBeUndefined();
    expect(resolveFailedStage('rejected', null, undefined)).toBeUndefined();
  });
});
