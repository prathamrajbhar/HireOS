import {
  Rec,
  isObject,
  asStringArray,
  statusToStage,
  candidateName,
  candidateEmail,
  orgName,
  toIso,
  toDatePart,
} from './serializers.common';
import { resolveFailedStage } from './failed-stage';
import {
  firstEvaluation,
  serializeScores,
  serializeInterview,
  serializeTranscript,
  type InterviewLike,
  type EvalLike,
} from './serializers.interview';

export * from './serializers.interview';

interface ParsedExperienceRecord {
  company?: string;
  role?: string;
  duration?: string;
  description?: string;
}

interface AssessmentRecord {
  id: string;
  application_id?: string;
  test_type?: string;
  status?: string;
  created_at?: string | Date;
  score?: number;
}

function normalizeSocialUrl(url: unknown, defaultDomain?: 'github.com' | 'linkedin.com'): string | undefined {
  if (typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^(www\.)?(github\.com|linkedin\.com)/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  if (defaultDomain) {
    const cleanHandle = trimmed.replace(/^@/, '');
    if (defaultDomain === 'linkedin.com') {
      return `https://linkedin.com/in/${cleanHandle}`;
    }
    return `https://github.com/${cleanHandle}`;
  }

  return `https://${trimmed}`;
}

export function serializeApplication(app: Rec, options?: { scheduledSlots?: string[] }): Rec {
  const candidate = isObject(app.candidate) ? app.candidate : undefined;
  const job = isObject(app.job) ? app.job : undefined;
  const evalFirst = firstEvaluation(app.evaluations);
  const evalList = Array.isArray(app.evaluations) ? app.evaluations : [];
  const evalReject = evalList.find((e) => isObject(e) && (e as EvalLike).decision === 'reject') as (EvalLike & Rec) | undefined;
  const evalWithReason = evalList.find((e) => isObject(e) && typeof (e as EvalLike).reasoning === 'string' && (e as EvalLike).reasoning?.trim()) as (EvalLike & Rec) | undefined;
  const effectiveEval = evalReject || evalFirst || evalWithReason;
  const effectiveReasoning = typeof effectiveEval?.reasoning === 'string' ? effectiveEval.reasoning : undefined;
  const interview = isObject(app.interview) ? (app.interview as InterviewLike & Rec) : undefined;

  const decision =
    evalFirst?.decision === 'hire'
      ? 'hire'
      : evalFirst?.decision === 'reject'
      ? 'reject'
      : evalFirst?.decision === 'hold_for_review'
      ? 'hold'
      : undefined;

  const parsedResume = isObject(candidate?.parsed_resume) ? (candidate!.parsed_resume as Rec) : undefined;
  const rawExperienceList = Array.isArray(parsedResume?.experience) ? (parsedResume!.experience as unknown[]) : [];
  const workExperience = rawExperienceList
    .filter(isObject)
    .map((experienceItem) => {
      const exp = experienceItem as ParsedExperienceRecord;
      return {
        company: typeof exp.company === 'string' ? exp.company : '',
        role: typeof exp.role === 'string' ? exp.role : '',
        duration: typeof exp.duration === 'string' ? exp.duration : '',
        description: typeof exp.description === 'string' ? exp.description : '',
      };
    });

  const socialData = isObject(candidate?.social_data) ? (candidate!.social_data as Rec) : undefined;
  const rawGithub =
    (typeof candidate?.github_url === 'string' && candidate.github_url) ||
    (isObject(socialData?.github) && typeof (socialData!.github as Rec).profileUrl === 'string' && (socialData!.github as Rec).profileUrl) ||
    (isObject(socialData?.github) && typeof (socialData!.github as Rec).url === 'string' && (socialData!.github as Rec).url) ||
    (typeof parsedResume?.githubUrl === 'string' && parsedResume.githubUrl) ||
    (typeof parsedResume?.github === 'string' && parsedResume.github) ||
    undefined;

  const rawLinkedin =
    (typeof candidate?.linkedin_url === 'string' && candidate.linkedin_url) ||
    (isObject(socialData?.linkedin) && typeof (socialData!.linkedin as Rec).profileUrl === 'string' && (socialData!.linkedin as Rec).profileUrl) ||
    (isObject(socialData?.linkedin) && typeof (socialData!.linkedin as Rec).url === 'string' && (socialData!.linkedin as Rec).url) ||
    (typeof parsedResume?.linkedinUrl === 'string' && parsedResume.linkedinUrl) ||
    (typeof parsedResume?.linkedin === 'string' && parsedResume.linkedin) ||
    undefined;

  const rawPortfolio =
    (typeof candidate?.portfolio_url === 'string' && candidate.portfolio_url) ||
    (typeof parsedResume?.portfolioUrl === 'string' && parsedResume.portfolioUrl) ||
    (typeof parsedResume?.portfolio === 'string' && parsedResume.portfolio) ||
    undefined;

  const githubUrl = normalizeSocialUrl(rawGithub, 'github.com');
  const linkedinUrl = normalizeSocialUrl(rawLinkedin, 'linkedin.com');
  const portfolioUrl = normalizeSocialUrl(rawPortfolio);

  const rawAssessmentsList = Array.isArray(app.assessments) ? (app.assessments as unknown[]) : [];
  const assessments = rawAssessmentsList
    .filter(isObject)
    .map((assessmentItem) => {
      const assessmentRecord = assessmentItem as unknown as AssessmentRecord;
      return {
        id: assessmentRecord.id,
        applicationId: assessmentRecord.application_id || '',
        assessmentName: assessmentRecord.test_type === 'aptitude' ? 'Aptitude Assessment' : 'Coding Assessment',
        category: assessmentRecord.test_type === 'aptitude' ? 'aptitude' : 'coding',
        status: assessmentRecord.status === 'in_progress'
          ? 'in_progress'
          : assessmentRecord.status === 'completed'
          ? 'completed'
          : 'not_started',
        completedDate: assessmentRecord.created_at ? new Date(assessmentRecord.created_at).toISOString() : undefined,
        overallScore: typeof assessmentRecord.score === 'number' ? assessmentRecord.score : undefined,
      };
    });

  return {
    id: app.id,
    candidateName: candidateName(candidate),
    candidateEmail: candidateEmail(candidate),
    candidateAvatar: (isObject(app.candidate) && typeof app.candidate.avatar_url === 'string' && app.candidate.avatar_url)
      ? (app.candidate.avatar_url as string)
      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(candidateName(candidate))}`,
    jobId: job?.id || app.job_id,
    jobTitle: typeof job?.title === 'string' ? job.title : '',
    orgName: orgName(job),
    status: app.status,
    stage: statusToStage(typeof app.status === 'string' ? app.status : undefined),
    failedStage: resolveFailedStage(app.status, app.hr_round_status, effectiveEval?.stage),
    hrRoundStatus: typeof app.hr_round_status === 'string' ? app.hr_round_status.toUpperCase() : undefined,
    hrRoundScheduledAt: toIso(app.hr_round_scheduled_at),
    hrRoundCompletedAt: toIso(app.hr_round_completed_at),
    appliedDate: toDatePart(app.applied_at) || new Date().toISOString().split('T')[0],
    resumeUrl: isObject(app.candidate) && typeof app.candidate.resume_url === 'string' ? app.candidate.resume_url : '',
    githubUrl,
    linkedinUrl,
    portfolioUrl,
    skills: asStringArray(candidate?.skills),
    targetRoles: asStringArray(candidate?.target_roles),
    yearsOfExperience: typeof candidate?.years_of_experience === 'number' ? candidate.years_of_experience : undefined,
    location: typeof candidate?.location === 'string' ? candidate.location : undefined,
    noticePeriod: typeof candidate?.notice_period === 'string' ? candidate.notice_period : undefined,
    expectedSalary: typeof candidate?.expected_salary === 'number' ? candidate.expected_salary : undefined,
    workExperience: workExperience.length > 0 ? workExperience : undefined,
    parsedResume: isObject(candidate?.parsed_resume) ? (candidate.parsed_resume as Rec) : undefined,
    rawResumeText: typeof candidate?.raw_resume_text === 'string' ? candidate.raw_resume_text : undefined,
    scores: serializeScores(effectiveEval),
    decision,
    reasoning: effectiveReasoning,
    rejectionReason:
      app.status === 'rejected' || decision === 'reject' || evalReject
        ? (effectiveReasoning && effectiveReasoning.trim()
            ? effectiveReasoning.trim()
            : 'Candidate did not meet the required stage threshold.')
        : undefined,
    transcript: serializeTranscript(interview),
    audioUrl: interview?.audio_url || undefined,
    proctorFlags: serializeInterview(interview)?.proctorFlags,
    engagementSignal: serializeInterview(interview)?.engagementSignal,
    assessments: assessments.length > 0 ? assessments : undefined,
    scheduledSlots:
      options?.scheduledSlots && options.scheduledSlots.length > 0 ? options.scheduledSlots : undefined,
  };
}

export function serializeApplicationList(applications: Rec[]): Rec[] {
  return (applications || []).map((applicationRecord) => serializeApplication(applicationRecord));
}

export function serializeOffer(offerRaw: Rec, application?: Rec): Rec {
  const job = isObject(application?.job) ? application.job : undefined;
  const candidate = isObject(application?.candidate) ? application.candidate : undefined;
  const salary = typeof offerRaw.salary === 'number' ? offerRaw.salary : 0;
  const status =
    typeof offerRaw.status === 'string'
      ? offerRaw.status === 'pending' || offerRaw.status === 'negotiating'
        ? 'sent'
        : offerRaw.status
      : 'draft';

  return {
    id: offerRaw.id,
    applicationId: application?.id,
    candidateName: candidateName(candidate),
    candidateAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(candidateName(candidate))}`,
    jobId: job?.id,
    jobTitle: typeof job?.title === 'string' ? job.title : '',
    orgName: orgName(job),
    status,
    baseSalary: salary ? `$${salary.toLocaleString('en-US')}` : 'Competitive',
    bonus: '10%',
    equity: typeof offerRaw.equity === 'string' ? offerRaw.equity : '0%',
    joiningDate: toDatePart(offerRaw.start_date),
    expiryDate: toDatePart(offerRaw.valid_until),
    benefits: [],
    negotiationHistory: [],
    letterUrl: '',
  };
}
