export interface HRAnalyticsData {
  totalCandidatesProcessed: number;
  zeroHumanHires: number | null;
  totalHires: number;
  avgTimeToOfferDays: number | null;
  funnel: { stage: string; count: number; pct: number }[];
  monthlyTrends: { month: string; applicants: number; hires: number; passRate: number }[];
  kpis?: {
    totalApplications?: number;
    activeJobs?: number;
    zeroHumanHires?: number | null;
    totalHires?: number;
    avgTimeToOfferDays?: number | null;
    avgTimeToHireDays?: number;
    offerAcceptanceRatePercent?: number;
  };
  dropoffAnalysis?: { stage: string; percentage: number; dropCount: number }[];
  weeklyFunnel?: { week?: string; applied?: number; offered?: number }[];
}

export const INITIAL_ANALYTICS: HRAnalyticsData = {
  totalCandidatesProcessed: 0,
  zeroHumanHires: null,
  totalHires: 0,
  avgTimeToOfferDays: null,
  funnel: [
    { stage: 'Sourced', count: 0, pct: 0 },
    { stage: 'Screened', count: 0, pct: 0 },
    { stage: 'Assessment', count: 0, pct: 0 },
    { stage: 'Voice Interview', count: 0, pct: 0 },
    { stage: 'Evaluation', count: 0, pct: 0 },
    { stage: 'Offer Sent', count: 0, pct: 0 },
  ],
  monthlyTrends: [],
};
