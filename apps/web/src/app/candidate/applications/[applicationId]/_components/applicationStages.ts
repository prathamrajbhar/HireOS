import type { Application, AssessmentResult, Job } from '@/types';

export type StageKey = 'applied' | 'screening' | 'assessment' | 'interview' | 'hr_round' | 'decision';

export interface ApplicationStage {
  key: StageKey;
  name: string;
  desc: string;
  date: string;
  done: boolean;
  failed?: boolean;
}

type Status = Application['status'];

// Statuses reached once a given stage has been passed. Each list extends the previous one.
const OFFER_TRACK: Status[] = ['decided', 'offered', 'accepted', 'hired'];
const AFTER_HR_ROUND: Status[] = ['hr_round', ...OFFER_TRACK];
const AFTER_INTERVIEW: Status[] = ['interviewed', 'voice_screen', 'evaluation', ...AFTER_HR_ROUND];
const AFTER_ASSESSMENT: Status[] = ['interview_scheduled', ...AFTER_INTERVIEW];
const AFTER_SCREENING: Status[] = ['screening_completed', 'assessment', ...AFTER_ASSESSMENT];

export function hasCodingRound(job?: Job | null): boolean {
  const cfg = job?.assessmentConfig as Record<string, unknown> | undefined;
  if (!cfg) return false;
  return cfg.coding_enabled !== false && (cfg.coding_enabled === true || Boolean(cfg.codingProblemId));
}

export function summarizeAssessments(job: Job | null | undefined, assessments: AssessmentResult[]) {
  const aptitude = assessments.find(
    (a) => a.category === 'aptitude' || a.assessmentName?.toLowerCase().includes('aptitude')
  );
  const coding = assessments.find(
    (a) => a.category === 'coding' || a.assessmentName?.toLowerCase().includes('coding')
  );
  const aptitudeDone = aptitude?.status === 'completed';
  const codingDone = coding?.status === 'completed';
  const hasCoding = hasCodingRound(job);
  return {
    hasCoding,
    aptitude,
    coding,
    aptitudeDone,
    codingDone,
    allDone: hasCoding ? aptitudeDone && codingDone : aptitudeDone,
  };
}

export function isDecisionDone(status: Status): boolean {
  return status === 'rejected' || OFFER_TRACK.includes(status);
}

export function buildApplicationStages(
  app: Application,
  job?: Job | null,
  assessments: AssessmentResult[] = []
): ApplicationStage[] {
  const jobStages = job?.stages;
  const enabled = (...keys: NonNullable<Job['stages']>) => !jobStages || keys.some((k) => jobStages.includes(k));
  const { allDone } = summarizeAssessments(job, assessments);

  const screened = AFTER_SCREENING.includes(app.status);
  const assessed = AFTER_ASSESSMENT.includes(app.status) || allDone;
  const interviewed = AFTER_INTERVIEW.includes(app.status);
  const hrPassed = app.hrRoundStatus === 'PASSED' || OFFER_TRACK.includes(app.status);
  const decided = isDecisionDone(app.status);

  const stages: (ApplicationStage | false)[] = [
    {
      key: 'applied',
      name: 'Applied',
      desc: 'Application received and resume queue matching active.',
      date: app.appliedDate,
      done: true,
    },
    enabled('screening') && {
      key: 'screening',
      name: 'Screened',
      desc: 'AI Screening Agent completed parsing and qualification matching.',
      date: screened ? app.appliedDate : '',
      done: screened,
    },
    enabled('assessment') && {
      key: 'assessment',
      name: 'Assessment',
      desc: 'Completed Aptitude Test & Coding Assessment module.',
      date: assessed ? assessments[0]?.completedDate?.slice(0, 10) || app.appliedDate : '',
      done: assessed,
    },
    enabled('voice_screen') && {
      key: 'interview',
      name: 'Interview',
      desc: 'Completed voice conversational session with Interviewer Agent.',
      date: interviewed ? app.appliedDate : '',
      done: interviewed,
    },
    enabled('panel', 'hr_round') && {
      key: 'hr_round',
      name: 'HR Round',
      desc: 'Live 1:1 human video call evaluation with HR representative.',
      date: hrPassed
        ? app.hrRoundCompletedAt || app.hrRoundScheduledAt || app.appliedDate
        : app.hrRoundScheduledAt || '',
      done: hrPassed,
    },
    {
      key: 'decision',
      name: 'Decision',
      desc: 'Final structured scoring compiled. Outcome determined.',
      date: decided ? app.appliedDate : '',
      done: decided,
    },
  ];

  return applyRejection(
    stages.filter((s): s is ApplicationStage => s !== false),
    app
  );
}

/**
 * A rejected application carries no stage-progress info in `status`, so status-inferred
 * "done" flags are unreliable. Use the failed stage reported by the API: stages before it
 * passed, it failed, and nothing after it is complete.
 */
export function applyRejection(stages: ApplicationStage[], app: Application): ApplicationStage[] {
  if (app.status !== 'rejected') return stages;

  const failedKey = app.failedStage ?? 'decision';
  const failedIdx = stages.findIndex((s) => s.key === failedKey);
  if (failedIdx === -1) return stages;

  return stages.map((s, idx) => {
    if (idx < failedIdx) return { ...s, done: true, date: s.date || app.appliedDate };
    if (idx === failedIdx) return { ...s, done: false, failed: true, date: '' };
    return app.failedStage ? { ...s, done: false, date: '' } : s;
  });
}
