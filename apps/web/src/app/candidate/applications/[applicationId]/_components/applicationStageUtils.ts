import { Application, AssessmentResult, Job, Offer, OnboardingRecord } from '@/types';
import { Gift, ClipboardCheck, UserPlus, Sparkles } from '@/lib/lucide-google-icons';
import { isDecisionDone, summarizeAssessments } from './applicationStages';

export { buildApplicationStages } from './applicationStages';
export type { ApplicationStage } from './applicationStages';


export function buildApplicationNextSteps(params: {
  app: Application;
  job?: Job | null;
  assessments: AssessmentResult[];
  offer?: Offer | null;
  onboarding?: OnboardingRecord | null;
}) {
  const { app, job, assessments, offer, onboarding } = params;
  const decisionDone = isDecisionDone(app.status);
  const { hasCoding, aptitude: aptitudeAssessment, coding: codingAssessment, aptitudeDone, codingDone, allDone: allAssessmentsDone } =
    summarizeAssessments(job, assessments);

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
      decisionDone && {
        icon: Gift,
        label: 'Review Your Offer',
        desc: `${offer.status === 'accepted' ? 'Accepted' : 'Action needed'} — ${offer.baseSalary} base salary`,
        href: `/candidate/applications/${app.id}/offer`,
        tone: 'emerald' as const,
        badge: offer.status === 'accepted' ? 'Completed' : 'Action Required',
      },

    onboarding &&
      decisionDone && {
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
