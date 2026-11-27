import { prisma } from '../../lib/prisma';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const HUMAN_INTERVENTION_ACTIONS = new Set([
  'hr_evaluation_override',
  'hr_status_override',
  'hr_stage_advance',
  'hr_round_decision',
  'hr_manual_schedule',
]);

const AUTOMATED_AUDIT_AGENTS = new Set(['decision_agent', 'evaluator_agent']);
const AUTOMATED_AUDIT_ACTIONS = new Set([
  'automated_decision',
  'apply_decision',
  'evaluate_candidate',
]);

export interface AnalyticsApplicationRecord {
  id: string;
  status: string;
  applied_at: Date;
  hr_round_status: string | null;
  hr_round_scheduled_at: Date | null;
  hr_round_completed_at: Date | null;
  offer: {
    id: string;
    status: string;
    created_at: Date;
    offer_letter_content: string | null;
  } | null;
  evaluations: Array<{
    id: string;
    stage: string;
    decision: string | null;
    confidence: number | null;
    reasoning: string | null;
  }>;
}

export interface AnalyticsAgentLogRecord {
  agent_name: string;
  action: string;
  input: unknown;
  output: unknown;
}

function parseValidDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function extractApplicationId(log: AnalyticsAgentLogRecord): string | null {
  for (const payload of [log.input, log.output]) {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const appId = (payload as Record<string, unknown>).application_id;
      if (typeof appId === 'string' && appId.length > 0) {
        return appId;
      }
    }
  }
  return null;
}

/**
 * Computes average time from application creation to offer issuance in decimal days
 * rounded to 1 decimal place. Returns null when no eligible offers exist.
 */
export function calculateAvgTimeToOfferDays(
  applications: AnalyticsApplicationRecord[]
): number | null {
  const offerTimeMsList: number[] = [];

  for (const app of applications) {
    const appliedAt = parseValidDate(app.applied_at);
    const offerCreatedAt = parseValidDate(app.offer?.created_at);
    if (!appliedAt || !offerCreatedAt) continue;

    const diffMs = offerCreatedAt.getTime() - appliedAt.getTime();
    if (diffMs < 0) continue;

    offerTimeMsList.push(diffMs);
  }

  if (offerTimeMsList.length === 0) {
    return null;
  }

  const avgDays =
    offerTimeMsList.reduce((acc, val) => acc + val, 0) /
    offerTimeMsList.length /
    MS_PER_DAY;

  return Math.round(avgDays * 10) / 10;
}

function hasRecordedHumanIntervention(
  app: AnalyticsApplicationRecord,
  humanInterventionAppIds: Set<string>
): boolean {
  if (humanInterventionAppIds.has(app.id)) return true;

  if (
    app.hr_round_completed_at !== null ||
    app.hr_round_scheduled_at !== null ||
    app.hr_round_status !== null
  ) {
    return true;
  }

  const hasHrOrOverrideEvaluation = app.evaluations.some(
    (ev) =>
      ev.stage === 'hr_round' ||
      ev.decision === 'hold_for_review' ||
      (typeof ev.reasoning === 'string' && ev.reasoning.startsWith('HR Override'))
  );
  if (hasHrOrOverrideEvaluation) return true;

  if (
    typeof app.offer?.offer_letter_content === 'string' &&
    app.offer.offer_letter_content.includes('(Approved by HR Override)')
  ) {
    return true;
  }

  return false;
}

/**
 * Counts successful hires ('accepted') that completed the workflow with verifiable
 * automated audit history and zero recorded human interventions.
 * Returns null when there are no hires or when no hires have verifiable audit history.
 */
export function calculateZeroHumanHires(
  applications: AnalyticsApplicationRecord[],
  agentLogs: AnalyticsAgentLogRecord[]
): { zeroHumanHires: number | null; totalHires: number } {
  const seenAppIds = new Set<string>();
  const hiredApps: AnalyticsApplicationRecord[] = [];

  for (const app of applications) {
    if (app.status === 'accepted' && !seenAppIds.has(app.id)) {
      seenAppIds.add(app.id);
      hiredApps.push(app);
    }
  }

  const totalHires = hiredApps.length;
  if (totalHires === 0) {
    return { zeroHumanHires: null, totalHires: 0 };
  }

  const humanInterventionAppIds = new Set<string>();
  const automatedAuditAppIds = new Set<string>();

  for (const log of agentLogs) {
    const appId = extractApplicationId(log);
    if (!appId) continue;

    if (log.agent_name === 'hr_user' || HUMAN_INTERVENTION_ACTIONS.has(log.action)) {
      humanInterventionAppIds.add(appId);
    } else if (
      AUTOMATED_AUDIT_AGENTS.has(log.agent_name) ||
      AUTOMATED_AUDIT_ACTIONS.has(log.action)
    ) {
      automatedAuditAppIds.add(appId);
    }
  }

  let auditableHiresCount = 0;
  let zeroHumanCount = 0;

  for (const app of hiredApps) {
    if (hasRecordedHumanIntervention(app, humanInterventionAppIds)) {
      auditableHiresCount++;
    } else if (automatedAuditAppIds.has(app.id)) {
      auditableHiresCount++;
      zeroHumanCount++;
    }
  }

  if (auditableHiresCount === 0) {
    return { zeroHumanHires: null, totalHires };
  }

  return { zeroHumanHires: zeroHumanCount, totalHires };
}

export async function getOrgAnalytics(orgId: string) {
  const jobs = await prisma.job.findMany({
    where: { org_id: orgId },
    select: { id: true, status: true },
  });

  const jobIds = jobs.map((j) => j.id);
  const activeJobsCount = jobs.filter(
    (j) => j.status === 'active' || j.status === 'published'
  ).length;

  const [applications, agentLogs] =
    jobIds.length > 0
      ? await Promise.all([
          prisma.application.findMany({
            where: { job_id: { in: jobIds } },
            select: {
              id: true,
              status: true,
              applied_at: true,
              hr_round_status: true,
              hr_round_scheduled_at: true,
              hr_round_completed_at: true,
              offer: {
                select: {
                  id: true,
                  status: true,
                  created_at: true,
                  offer_letter_content: true,
                },
              },
              evaluations: {
                select: {
                  id: true,
                  stage: true,
                  decision: true,
                  confidence: true,
                  reasoning: true,
                },
              },
            },
          }),
          prisma.agentLog.findMany({
            where: {
              org_id: orgId,
              status: 'completed',
            },
            select: {
              agent_name: true,
              action: true,
              input: true,
              output: true,
            },
          }),
        ])
      : [[], []];

  const totalApplications = applications.length;

  let applied = 0;
  let screened = 0;
  let interviewed = 0;
  let offered = 0;
  let accepted = 0;

  applications.forEach((app) => {
    applied++;
    if (
      [
        'screening_completed',
        'assessment',
        'interview_scheduled',
        'interviewed',
        'evaluation',
        'hr_round',
        'decided',
        'offered',
        'accepted',
      ].includes(app.status)
    ) {
      screened++;
    }
    if (
      ['interviewed', 'evaluation', 'hr_round', 'decided', 'offered', 'accepted'].includes(
        app.status
      )
    ) {
      interviewed++;
    }
    if (['offered', 'accepted'].includes(app.status)) {
      offered++;
    }
    if (app.status === 'accepted') {
      accepted++;
    }
  });

  const stageConversionRates = {
    appliedToScreened: applied > 0 ? Math.round((screened / applied) * 100) : 0,
    screenedToInterviewed: screened > 0 ? Math.round((interviewed / screened) * 100) : 0,
    interviewedToOffered: interviewed > 0 ? Math.round((offered / interviewed) * 100) : 0,
    offerAcceptanceRate: offered > 0 ? Math.round((accepted / offered) * 100) : 0,
  };

  const hireTimeMsList: number[] = [];
  applications.forEach((app) => {
    if (app.hr_round_completed_at) {
      const diff = app.hr_round_completed_at.getTime() - app.applied_at.getTime();
      if (diff > 0) hireTimeMsList.push(diff);
    }
  });
  const avgTimeToHireDays =
    hireTimeMsList.length > 0
      ? Math.round(
          hireTimeMsList.reduce((acc, val) => acc + val, 0) /
            hireTimeMsList.length /
            MS_PER_DAY
        )
      : 0;

  const avgTimeToOfferDays = calculateAvgTimeToOfferDays(applications);
  const { zeroHumanHires, totalHires } = calculateZeroHumanHires(applications, agentLogs);

  const now = new Date();
  const getWeekBucket = (date: Date) => {
    const diffDays = Math.floor((now.getTime() - date.getTime()) / MS_PER_DAY);
    if (diffDays <= 7) return 3;
    if (diffDays <= 14) return 2;
    if (diffDays <= 21) return 1;
    return 0;
  };

  const weeklyCounts = [
    { week: 'Week 1', applied: 0, screened: 0, interviewed: 0, offered: 0 },
    { week: 'Week 2', applied: 0, screened: 0, interviewed: 0, offered: 0 },
    { week: 'Week 3', applied: 0, screened: 0, interviewed: 0, offered: 0 },
    { week: 'Week 4', applied: 0, screened: 0, interviewed: 0, offered: 0 },
  ];

  applications.forEach((app) => {
    const bucket = getWeekBucket(app.applied_at);
    weeklyCounts[bucket].applied++;
    if (
      [
        'screening_completed',
        'assessment',
        'interview_scheduled',
        'interviewed',
        'evaluation',
        'hr_round',
        'decided',
        'offered',
        'accepted',
      ].includes(app.status)
    ) {
      weeklyCounts[bucket].screened++;
    }
    if (
      ['interviewed', 'evaluation', 'hr_round', 'decided', 'offered', 'accepted'].includes(
        app.status
      )
    ) {
      weeklyCounts[bucket].interviewed++;
    }
    if (['offered', 'accepted'].includes(app.status)) {
      weeklyCounts[bucket].offered++;
    }
  });

  const dropoffAnalysis = [
    {
      stage: 'Screening to Interview',
      dropCount: Math.max(0, screened - interviewed),
      percentage: screened > 0 ? Math.round(((screened - interviewed) / screened) * 100) : 0,
    },
    {
      stage: 'Interview to Offer',
      dropCount: Math.max(0, interviewed - offered),
      percentage: interviewed > 0 ? Math.round(((interviewed - offered) / interviewed) * 100) : 0,
    },
    {
      stage: 'Offer to Acceptance',
      dropCount: Math.max(0, offered - accepted),
      percentage: offered > 0 ? Math.round(((offered - accepted) / offered) * 100) : 0,
    },
  ];

  return {
    kpis: {
      totalApplications,
      activeJobs: activeJobsCount,
      avgTimeToHireDays,
      avgTimeToOfferDays,
      zeroHumanHires,
      totalHires,
      offerAcceptanceRatePercent: stageConversionRates.offerAcceptanceRate,
    },
    weeklyFunnel: weeklyCounts,
    stageConversionRates,
    dropoffAnalysis,
  };
}

