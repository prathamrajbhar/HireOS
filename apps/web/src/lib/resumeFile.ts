import { siteConfig as config } from '@/lib/config';

/**
 * Resumes live in S3. The API redirects (authenticated, org-scoped) to a short-lived
 * presigned URL, so links never expose raw bucket URLs.
 */
export function hrResumeHref(applicationId: string): string {
  return `${config.apiBaseUrl}/hr/applications/${applicationId}/resume`;
}

export function myResumeHref(): string {
  return `${config.apiBaseUrl}/candidate/profile/resume`;
}

/** Original uploaded file name, minus the "<timestamp>-" prefix added at upload. */
export function resumeFileName(resumeUrl?: string | null): string | null {
  const raw = (resumeUrl || '').trim();
  if (!raw) return null;
  const last = raw.split('?')[0].split('/').pop() || '';
  try {
    return decodeURIComponent(last).replace(/^\d{10,}-/, '') || null;
  } catch {
    return last.replace(/^\d{10,}-/, '') || null;
  }
}
