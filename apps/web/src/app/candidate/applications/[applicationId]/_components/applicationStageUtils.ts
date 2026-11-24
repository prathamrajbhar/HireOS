import { Application, AssessmentResult, Job, Offer, OnboardingRecord } from '@/types';
import { Gift, ClipboardCheck, UserPlus, Sparkles } from '@/lib/lucide-google-icons';

export function buildApplicationStages(
  app: Application,
  job?: Job | null,
  assessments: AssessmentResult[] = []
) {
  const isScreenedDone = [
    'screening_completed',
    'assessment',
    'interview_scheduled',
    'interviewed',
    'voice_screen',
    'evaluation',
    'hr_round',
    'decided',
    'offered',
    'accepted',
    'hired',
  ].includes(app.status);

  const cfg = job?.assessmentConfig as Record<string, unknown> | undefined;
  const hasCoding = cfg
    ? cfg.coding_enabled !== false && (cfg.coding_enabled === true || Boolean(cfg.codingProblemId))
    : false;

  const aptitudeAssessment = assessments.find(
    (a) => a.category === 'aptitude' || a.assessmentName?.toLowerCase().includes('aptitude')
  );
  const codingAssessment = assessments.find(
    (a) => a.category === 'coding' || a.assessmentName?.toLowerCase().includes('coding')
  );

  const aptitudeDone = aptitudeAssessment?.status === 'completed';
  const codingDone = codingAssessment?.status === 'completed';
  const allAssessmentsDone = hasCoding ? aptitudeDone && codingDone : aptitudeDone;

  const isAssessmentDone =
    [
      'interview_scheduled',
      'interviewed',
      'voice_screen',
      'evaluation',
      'hr_round',
      'decided',
      'offered',
      'accepted',
      'hired',
    ].includes(app.status) || allAssessmentsDone;

  const isInterviewDone = [
    'interviewed',
    'voice_screen',
    'evaluation',
    'hr_round',
    'decided',
    'offered',
    'accepted',
    'hired',
  ].includes(app.status);

  const isHrRoundDone =
    app.hrRoundStatus === 'PASSED' ||
    ['decided', 'offered', 'accepted', 'hired'].includes(app.status);

  const isDecisionDone = ['decided', 'offered', 'accepted', 'hired', 'rejected'].includes(
    app.status
  );

  return [
    {
      name: 'Applied',
      desc: 'Application received and resume queue matching active.',
      date: app.appliedDate,
      done: true,
    },
    (!job?.stages || job.stages.includes('screening')) && {
      name: 'Screened',
      desc: 'AI Screening Agent completed parsing and qualification matching.',
      date: isScreenedDone ? app.appliedDate : '',
      done: isScreenedDone,
    },
    (!job?.stages || job.stages.includes('assessment')) && {
      name: 'Assessment',
      desc: 'Completed Aptitude Test & Coding Assessment module.',
      date: isAssessmentDone ? assessments[0]?.completedDate || app.appliedDate : '',
      done: isAssessmentDone,
    },
    (!job?.stages || job.stages.includes('voice_screen')) && {
      name: 'Interview',
      desc: 'Completed voice conversational session with Interviewer Agent.',
      date: isInterviewDone ? app.appliedDate : '',
      done: isInterviewDone,
    },
    (!job?.stages || job.stages.includes('panel') || job.stages.includes('hr_round')) && {
      name: 'HR Round',
      desc: 'Live 1:1 human video call evaluation with HR representative.',
      date: isHrRoundDone
        ? app.hrRoundCompletedAt || app.hrRoundScheduledAt || app.appliedDate
        : app.hrRoundScheduledAt || '',
      done: isHrRoundDone,
    },
    {
      name: 'Decision',
      desc: 'Final structured scoring compiled. Outcome determined.',
      date: isDecisionDone ? app.appliedDate : '',
      done: isDecisionDone,
    },
  ].filter(Boolean) as { name: string; desc: string; date: string; done: boolean }[];
}

export function buildApplicationNextSteps(params: {
  app: Application;
  job?: Job | null;
  assessments: AssessmentResult[];
  offer?: Offer | null;
  onboarding?: OnboardingRecord | null;
}) {
  const { app, job, assessments, offer, onboarding } = params;
  const isDecisionDone = ['decided', 'offered', 'accepted', 'hired', 'rejected'].includes(
    app.status
  );

  const cfg = job?.assessmentConfig as Record<string, unknown> | undefined;
  const hasCoding = cfg
    ? cfg.coding_enabled !== false && (cfg.coding_enabled === true || Boolean(cfg.codingProblemId))
    : false;

  const aptitudeAssessment = assessments.find(
    (a) => a.category === 'aptitude' || a.assessmentName?.toLowerCase().includes('aptitude')
  );
  const codingAssessment = assessments.find(
    (a) => a.category === 'coding' || a.assessmentName?.toLowerCase().includes('coding')
  );

  const aptitudeDone = aptitudeAssessment?.status === 'completed';
  const codingDone = codingAssessment?.status === 'completed';
  const allAssessmentsDone = hasCoding ? aptitudeDone && codingDone : aptitudeDone;

  const allNextSteps = [
    (app.status === 'applied' || app.status === 'screening') &&
      (!job?.stages || job.stages.includes('screening')) && {
        icon: Sparkles,
        label: 'AI Resume Screening',
        desc: 'Your application has been received. Click to run AI qualification matching.',
        href: '#',
        isScreeningModal: true,
        tone: 'indigo' as const,
        badge: 'In Progress',
      },

    (app.status === 'screening_completed' || app.status === 'assessment') &&
      (!job?.stages || job.stages.includes('assessment')) &&
      (() => {
        if (hasCoding && aptitudeDone && !codingDone) {
          return {
            icon: ClipboardCheck,
            label: 'Live Coding Assessment',
            desc:
              codingAssessment?.status === 'in_progress'
                ? 'Continue your timed live coding challenge'
                : 'Aptitude test completed. Launch your live coding round',
            href: `/candidate/applications/${app.id}/assessment?track=coding`,
            tone: 'indigo' as const,
            badge: codingAssessment?.status === 'in_progress' ? 'In Progress' : 'Pending',
          };
        }

        if (allAssessmentsDone) {
          return {
            icon: ClipboardCheck,
            label: 'Assessment Module',
            desc: `Completed — Score: ${assessments[0]?.overallScore != null ? `${assessments[0].overallScore}%` : 'Done'}`,
            href: `/candidate/applications/${app.id}/assessment`,
            tone: 'indigo' as const,
            badge: 'Completed',
          };
        }

        return {
          icon: ClipboardCheck,
          label: hasCoding ? 'Online Assessment & Coding Test' : 'Aptitude Assessment',
          desc:
            aptitudeAssessment?.status === 'in_progress'
              ? 'Continue your timed assessment'
              : hasCoding
              ? 'Complete aptitude MCQs and live coding challenges'
              : 'Continue your timed assessment',
          href: `/candidate/applications/${app.id}/assessment?track=${hasCoding ? 'comprehensive' : 'aptitude'}`,
          tone: 'indigo' as const,
          badge: aptitudeAssessment?.status === 'in_progress' ? 'In Progress' : 'Pending',
        };
      })(),

    offer &&
      isDecisionDone && {
        icon: Gift,
        label: 'Review Your Offer',
        desc: `${offer.status === 'accepted' ? 'Accepted' : 'Action needed'} — ${offer.baseSalary} base salary`,
        href: `/candidate/applications/${app.id}/offer`,
        tone: 'emerald' as const,
        badge: offer.status === 'accepted' ? 'Completed' : 'Action Required',
      },

    onboarding &&
      isDecisionDone && {
        icon: UserPlus,
        label: 'Onboarding Checklist',
        desc: `${onboarding.progressPercent}% complete — starts ${onboarding.startDate}`,
        href: `/candidate/applications/${app.id}/onboarding`,
        tone: 'emerald' as const,
        badge: `${onboarding.progressPercent}%`,
      },
  ].filter(Boolean) as {
    icon: typeof Gift;
    label: string;
    desc: string;
    href: string;
    isScreeningModal?: boolean;
    tone: 'emerald' | 'indigo' | 'purple' | 'amber';
    badge: string;
  }[];

  const completedBadges = ['Completed', 'Graded'];
  const firstIncomplete = allNextSteps.find((s) => !completedBadges.includes(s.badge));
  return firstIncomplete ? [firstIncomplete] : [];
}
