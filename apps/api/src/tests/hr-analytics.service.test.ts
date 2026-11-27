import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateAvgTimeToOfferDays,
  calculateZeroHumanHires,
  getOrgAnalytics,
  type AnalyticsApplicationRecord,
  type AnalyticsAgentLogRecord,
} from '../services/hr/analytics.service';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    job: { findMany: vi.fn() },
    application: { findMany: vi.fn() },
    agentLog: { findMany: vi.fn() },
  },
}));

vi.mock('../lib/prisma', () => ({
  prisma: mockPrisma,
}));

function makeApp(overrides: Partial<AnalyticsApplicationRecord> = {}): AnalyticsApplicationRecord {
  return {
    id: 'app-1',
    status: 'applied',
    applied_at: new Date('2026-10-01T10:00:00Z'),
    hr_round_status: null,
    hr_round_scheduled_at: null,
    hr_round_completed_at: null,
    offer: null,
    evaluations: [],
    ...overrides,
  };
}

describe('HR Analytics Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Scenario 1: returns null metrics and 0 totalHires when no applications exist', async () => {
    mockPrisma.job.findMany.mockResolvedValue([{ id: 'job-1', status: 'active' }]);
    mockPrisma.application.findMany.mockResolvedValue([]);
    mockPrisma.agentLog.findMany.mockResolvedValue([]);

    const result = await getOrgAnalytics('org-1');

    expect(result.kpis.avgTimeToOfferDays).toBeNull();
    expect(result.kpis.zeroHumanHires).toBeNull();
    expect(result.kpis.totalHires).toBe(0);
    expect(result.kpis.totalApplications).toBe(0);
    expect(result.kpis.activeJobs).toBe(1);
  });

  it('Scenario 2: returns null avgTimeToOfferDays when applications exist without offers', () => {
    const apps = [
      makeApp({ id: 'app-1', status: 'screening' }),
      makeApp({ id: 'app-2', status: 'interviewed' }),
    ];
    expect(calculateAvgTimeToOfferDays(apps)).toBeNull();
  });

  it('Scenario 3: handles same-day offer as 0 (or 0.x) days rather than null', () => {
    const sameInstantApp = makeApp({
      id: 'app-same-instant',
      applied_at: new Date('2026-10-01T10:00:00Z'),
      offer: {
        id: 'off-1',
        status: 'pending',
        created_at: new Date('2026-10-01T10:00:00Z'),
        offer_letter_content: 'Offer',
      },
    });
    expect(calculateAvgTimeToOfferDays([sameInstantApp])).toBe(0);

    const sameDayLaterApp = makeApp({
      id: 'app-same-day',
      applied_at: new Date('2026-10-01T08:00:00Z'),
      offer: {
        id: 'off-2',
        status: 'pending',
        created_at: new Date('2026-10-01T14:00:00Z'), // 6 hours = 0.25 days -> 0.3
        offer_letter_content: 'Offer',
      },
    });
    expect(calculateAvgTimeToOfferDays([sameDayLaterApp])).toBe(0.3);
  });

  it('Scenario 4: calculates average decimal days to 1 decimal place for multi-day offers', () => {
    const apps = [
      makeApp({
        id: 'app-1',
        applied_at: new Date('2026-10-01T00:00:00Z'),
        offer: {
          id: 'off-1',
          status: 'accepted',
          created_at: new Date('2026-10-02T12:00:00Z'), // 1.5 days
          offer_letter_content: 'Offer',
        },
      }),
      makeApp({
        id: 'app-2',
        applied_at: new Date('2026-10-01T00:00:00Z'),
        offer: {
          id: 'off-2',
          status: 'pending',
          created_at: new Date('2026-10-03T12:00:00Z'), // 2.5 days
          offer_letter_content: 'Offer',
        },
      }),
    ];
    expect(calculateAvgTimeToOfferDays(apps)).toBe(2);

    const appsSingle = [
      makeApp({
        id: 'app-3',
        applied_at: new Date('2026-10-01T00:00:00Z'),
        offer: {
          id: 'off-3',
          status: 'pending',
          created_at: new Date('2026-10-02T12:00:00Z'), // 1.5 days
          offer_letter_content: 'Offer',
        },
      }),
    ];
    expect(calculateAvgTimeToOfferDays(appsSingle)).toBe(1.5);
  });

  it('Scenario 5: ignores missing, invalid, or negative-duration offer timestamps', () => {
    const apps = [
      makeApp({ id: 'app-no-offer' }),
      makeApp({
        id: 'app-invalid-date',
        applied_at: new Date('invalid'),
        offer: {
          id: 'off-bad',
          status: 'pending',
          created_at: new Date('2026-10-05T00:00:00Z'),
          offer_letter_content: 'Offer',
        },
      }),
      makeApp({
        id: 'app-negative',
        applied_at: new Date('2026-10-05T00:00:00Z'),
        offer: {
          id: 'off-neg',
          status: 'pending',
          created_at: new Date('2026-10-01T00:00:00Z'),
          offer_letter_content: 'Offer',
        },
      }),
      makeApp({
        id: 'app-valid',
        applied_at: new Date('2026-10-01T00:00:00Z'),
        offer: {
          id: 'off-ok',
          status: 'pending',
          created_at: new Date('2026-10-04T00:00:00Z'), // 3.0 days
          offer_letter_content: 'Offer',
        },
      }),
    ];
    expect(calculateAvgTimeToOfferDays(apps)).toBe(3);
  });

  it('Scenario 6: returns zeroHumanHires = null and totalHires = 0 when no candidates are hired', () => {
    const apps = [
      makeApp({ id: 'app-1', status: 'offered' }),
      makeApp({ id: 'app-2', status: 'rejected' }),
    ];
    expect(calculateZeroHumanHires(apps, [])).toEqual({
      zeroHumanHires: null,
      totalHires: 0,
    });
  });

  it('Scenario 7: counts candidate hired without human intervention when automated audit log exists', () => {
    const apps = [
      makeApp({
        id: 'app-auto',
        status: 'accepted',
        evaluations: [{ id: 'ev-1', stage: 'final_evaluation', decision: 'hire', confidence: 0.92, reasoning: 'Strong match' }],
      }),
    ];
    const logs: AnalyticsAgentLogRecord[] = [
      {
        agent_name: 'decision_agent',
        action: 'automated_decision',
        input: { application_id: 'app-auto' },
        output: { decision: 'hire', status: 'offered' },
      },
    ];
    expect(calculateZeroHumanHires(apps, logs)).toEqual({
      zeroHumanHires: 1,
      totalHires: 1,
    });
  });

  it('Scenario 8: excludes candidate hired after HR intervention (HR round / HR scheduling)', () => {
    const apps = [
      makeApp({
        id: 'app-hr-round',
        status: 'accepted',
        hr_round_status: 'passed',
        hr_round_completed_at: new Date('2026-10-05T10:00:00Z'),
        evaluations: [{ id: 'ev-2', stage: 'hr_round', decision: 'hire', confidence: 0.95, reasoning: 'Passed HR' }],
      }),
    ];
    const logs: AnalyticsAgentLogRecord[] = [
      {
        agent_name: 'hr_user',
        action: 'hr_round_decision',
        input: { application_id: 'app-hr-round', decision: 'pass' },
        output: { status: 'decided' },
      },
      {
        agent_name: 'decision_agent',
        action: 'automated_decision',
        input: { application_id: 'app-hr-round' },
        output: { decision: 'hire', status: 'offered' },
      },
    ];
    expect(calculateZeroHumanHires(apps, logs)).toEqual({
      zeroHumanHires: 0,
      totalHires: 1,
    });
  });

  it('Scenario 9: excludes candidate hired after a manual override', () => {
    const apps = [
      makeApp({
        id: 'app-override',
        status: 'accepted',
        evaluations: [{ id: 'ev-3', stage: 'final_evaluation', decision: 'hire', confidence: 0.65, reasoning: 'HR Override: Approved' }],
        offer: {
          id: 'off-3',
          status: 'accepted',
          created_at: new Date('2026-10-04T10:00:00Z'),
          offer_letter_content: 'Official Job Offer (Approved by HR Override)',
        },
      }),
    ];
    const logs: AnalyticsAgentLogRecord[] = [
      {
        agent_name: 'hr_user',
        action: 'hr_evaluation_override',
        input: { application_id: 'app-override', decision: 'hire' },
        output: { status: 'offered' },
      },
    ];
    expect(calculateZeroHumanHires(apps, logs)).toEqual({
      zeroHumanHires: 0,
      totalHires: 1,
    });
  });

  it('Scenario 10: does not classify historical applications with missing audit history as zero-human-touch', () => {
    const historicalOnly = [
      makeApp({ id: 'app-hist-1', status: 'accepted' }),
      makeApp({ id: 'app-hist-2', status: 'accepted' }),
    ];
    expect(calculateZeroHumanHires(historicalOnly, [])).toEqual({
      zeroHumanHires: null,
      totalHires: 2,
    });

    // Mixed: 1 historical without audit + 1 auditable automated hire
    const mixed = [
      ...historicalOnly,
      makeApp({ id: 'app-auto-1', status: 'accepted' }),
    ];
    const logs: AnalyticsAgentLogRecord[] = [
      {
        agent_name: 'decision_agent',
        action: 'automated_decision',
        input: { application_id: 'app-auto-1' },
        output: { decision: 'hire', status: 'offered' },
      },
    ];
    expect(calculateZeroHumanHires(mixed, logs)).toEqual({
      zeroHumanHires: 1,
      totalHires: 3,
    });
  });

  it('avoids double-counting duplicate application entries', () => {
    const app = makeApp({ id: 'app-dup', status: 'accepted' });
    const logs: AnalyticsAgentLogRecord[] = [
      {
        agent_name: 'decision_agent',
        action: 'automated_decision',
        input: { application_id: 'app-dup' },
        output: { decision: 'hire' },
      },
      {
        agent_name: 'evaluator_agent',
        action: 'evaluate_candidate',
        input: { application_id: 'app-dup' },
        output: { decision: 'hire' },
      },
    ];
    expect(calculateZeroHumanHires([app, app], logs)).toEqual({
      zeroHumanHires: 1,
      totalHires: 1,
    });
  });
});

