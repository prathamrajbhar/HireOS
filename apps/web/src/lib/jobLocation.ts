export const WORK_MODES = ['Remote', 'Hybrid', 'On-site'] as const;

/** Builds the stored location string, e.g. "Pune (Hybrid)", "Remote". */
export function buildJobLocation(workMode: string, city: string): string {
  const place = city.trim();
  if (workMode === 'Remote') return place ? `Remote (${place})` : 'Remote';
  return place ? `${place} (${workMode})` : workMode;
}

/** Splits a stored location string back into work mode + city. */
export function parseJobLocation(loc?: string | null): { workMode: string; city: string } {
  const raw = (loc || '').trim();
  if (!raw) return { workMode: 'Remote', city: '' };
  const lower = raw.toLowerCase();
  const workMode = lower.includes('hybrid')
    ? 'Hybrid'
    : lower.includes('site') || lower.includes('office')
      ? 'On-site'
      : 'Remote';
  const city = raw
    .replace(/\((hybrid|on-?site|office|remote)\)/i, '')
    .replace(/^(remote|hybrid|on-?site)$/i, '')
    .trim();
  return { workMode, city };
}

/** Returns "₹13.0L - ₹18.0L", or '' when no complete range was entered. */
export function formatSalaryRange(min: number, max: number): string {
  if (!(min > 0) || !(max > 0)) return '';
  return `₹${(min / 100000).toFixed(1)}L - ₹${(max / 100000).toFixed(1)}L`;
}
