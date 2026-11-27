import type { Prisma } from '@nextround/database';

/**
 * Candidate columns that serializeApplication() reads. Any query whose result is passed to
 * serializeApplication/serializeApplicationList must select these, otherwise the HR UI
 * receives undefined and shows "N/A" for experience, location, notice period, etc.
 */
export const candidateSerializerSelect = {
  id: true,
  user: { select: { email: true } },
  avatar_url: true,
  resume_url: true,
  skills: true,
  target_roles: true,
  years_of_experience: true,
  location: true,
  notice_period: true,
  expected_salary: true,
  parsed_resume: true,
  raw_resume_text: true,
  github_url: true,
  linkedin_url: true,
  portfolio_url: true,
  social_data: true,
} satisfies Prisma.CandidateProfileSelect;
