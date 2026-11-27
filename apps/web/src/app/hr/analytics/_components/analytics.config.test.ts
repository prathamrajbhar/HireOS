import { describe, it, expect } from 'vitest';
import {
  ANALYTICS_BENCHMARKS,
  calculateOfferTimeProgress,
  calculateZeroHumanHiresProgress,
} from './analytics.config';

describe('HR Analytics Progress Calculations', () => {
  it('uses 10 days as initial benchmark', () => {
    expect(ANALYTICS_BENCHMARKS.AVG_TIME_TO_OFFER_DAYS).toBe(10);
  });

  it('calculates offer time progress relative to benchmark with clamping', () => {
    expect(calculateOfferTimeProgress(null)).toBe(0);
    expect(calculateOfferTimeProgress(undefined)).toBe(0);
    expect(calculateOfferTimeProgress(0)).toBe(100);
    expect(calculateOfferTimeProgress(1.5)).toBe(85);
    expect(calculateOfferTimeProgress(5)).toBe(50);
    expect(calculateOfferTimeProgress(10)).toBe(0);
    expect(calculateOfferTimeProgress(15)).toBe(0);
  });

  it('calculates zero-human-touch hires progress safely without division by zero', () => {
    expect(calculateZeroHumanHiresProgress(null, 0)).toBe(0);
    expect(calculateZeroHumanHiresProgress(null, 10)).toBe(0);
    expect(calculateZeroHumanHiresProgress(0, 0)).toBe(0);
    expect(calculateZeroHumanHiresProgress(0, 5)).toBe(0);
    expect(calculateZeroHumanHiresProgress(5, 12)).toBe(42);
    expect(calculateZeroHumanHiresProgress(12, 12)).toBe(100);
    expect(calculateZeroHumanHiresProgress(15, 12)).toBe(100);
  });
});

