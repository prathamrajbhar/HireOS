export const ANALYTICS_BENCHMARKS = {
  AVG_TIME_TO_OFFER_DAYS: 10,
} as const;

export function calculateOfferTimeProgress(
  avgTimeToOfferDays: number | null | undefined,
  benchmarkDays: number = ANALYTICS_BENCHMARKS.AVG_TIME_TO_OFFER_DAYS
): number {
  if (
    typeof avgTimeToOfferDays !== 'number' ||
    !Number.isFinite(avgTimeToOfferDays) ||
    avgTimeToOfferDays < 0 ||
    benchmarkDays <= 0
  ) {
    return 0;
  }

  const ratio = ((benchmarkDays - avgTimeToOfferDays) / benchmarkDays) * 100;
  return Math.max(0, Math.min(100, Math.round(ratio)));
}

export function calculateZeroHumanHiresProgress(
  zeroHumanHires: number | null | undefined,
  totalHires: number | null | undefined
): number {
  if (
    typeof zeroHumanHires !== 'number' ||
    !Number.isFinite(zeroHumanHires) ||
    zeroHumanHires < 0 ||
    typeof totalHires !== 'number' ||
    !Number.isFinite(totalHires) ||
    totalHires <= 0
  ) {
    return 0;
  }

  const pct = (zeroHumanHires / totalHires) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

