'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { Application, AssessmentResult } from '@/types';
import { useApplication, useOffer, useOnboarding, useJob } from '@/hooks/queries';
import { ErrorState } from '@/components/ui/ErrorState';
import { ChevronRight, ArrowRight, AlertCircle } from '@/lib/lucide-google-icons';
import { ApplicationHeaderBanner } from './_components/ApplicationHeaderBanner';
import { StagePipelineTimeline } from './_components/StagePipelineTimeline';
import { CandidateScorecard } from './_components/CandidateScorecard';
import { ScreeningAgentModal } from './_components/ScreeningAgentModal';
import { ApplicationActionSidebar } from './_components/ApplicationActionSidebar';
import {
  buildApplicationStages,
  buildApplicationNextSteps,
} from './_components/applicationStageUtils';
import { ApplicationDetailSkeleton } from '@/components/ui';

export default function CandidateApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = use(params);
  const queryClient = useQueryClient();

  const { data: app, isLoading, isError, error, refetch } = useApplication(applicationId);
  const { data: job } = useJob(app?.jobId ?? null);
  const { data: offer } = useOffer(applicationId);
  const { data: onboarding } = useOnboarding(applicationId);

  const rawApp = app as (Application & { assessments?: AssessmentResult[] }) | null | undefined;
  const assessments = Array.isArray(rawApp?.assessments) ? rawApp.assessments : [];

  const [showScreeningModal, setShowScreeningModal] = useState(false);
  const [runningScreening, setRunningScreening] = useState(false);
  const [screeningError, setScreeningError] = useState<string | null>(null);

  const handleRunScreening = async () => {
    if (runningScreening) return;
    try {
      setRunningScreening(true);
      setScreeningError(null);
      const res = await apiClient.post<{ application: Application }>(
        `/applications/${applicationId}/run-screening`
      );
      if (res?.application) {
        queryClient.setQueryData(['application', applicationId], res.application);
      }
    } catch (err: unknown) {
      setScreeningError(
        err instanceof Error ? err.message : 'Failed to complete AI screening evaluation.'
      );
    } finally {
      setRunningScreening(false);
    }
  };

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div className="w-full max-w-md">
          <ErrorState error={error} onRetry={refetch} />
        </div>
      </div>
    );
  }

  if (isLoading) return <ApplicationDetailSkeleton />;

  if (!app) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          Application Not Found
        </h2>
        <p className="text-xs text-slate-500">No application record found for ID: {applicationId}</p>
        <Link
          href="/candidate/applications"
          className="inline-block text-xs font-bold text-emerald-600 hover:underline"
        >
          Back to Applications
        </Link>
      </div>
    );
  }

  const stages = buildApplicationStages(app, job, assessments);
  const nextSteps = buildApplicationNextSteps({ app, job, assessments, offer, onboarding });
  const matchPercent = app.scores?.composite;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Link
            href="/candidate/applications"
            className="hover:text-brand-600 dark:hover:text-orange-400 transition-colors"
          >
            Applications
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
          <span className="text-slate-800 dark:text-slate-200 font-bold line-clamp-1">
            {app.jobTitle}
          </span>
        </div>

        <Link
          href={`/candidate/jobs/${app.jobId}`}
          className="text-xs font-bold text-brand-600 dark:text-orange-400 hover:underline flex items-center gap-1"
        >
          <span>View Original Job Listing</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <ApplicationHeaderBanner app={app} jobLogo={job?.orgLogo} matchPercent={matchPercent} />

      {app.status === 'rejected' && (
        <div className="rounded-3xl border border-rose-200/90 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/40 p-6 shadow-sm backdrop-blur-md glass-panel flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 animate-in fade-in duration-200">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-extrabold text-rose-950 dark:text-rose-200 font-display">
                  Application Not Selected
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-rose-200/70 dark:bg-rose-900/80 text-rose-800 dark:text-rose-300">
                  Status: Rejected
                </span>
              </div>
              <p className="text-xs text-rose-900 dark:text-rose-300 font-semibold leading-relaxed">
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700 dark:text-rose-400 mr-1.5">
                  Rejection Reason:
                </span>
                {app.rejectionReason || app.reasoning || 'Based on the evaluation criteria, the candidate profile did not meet the required threshold for this role.'}
              </p>
            </div>
          </div>

          <Link
            href={`/candidate/mock/new?company=${encodeURIComponent(app.orgName)}&role=${encodeURIComponent(app.jobTitle)}`}
            className="shrink-0 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <span>Practice with AI Mock</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <StagePipelineTimeline
            stages={stages}
            onStageClick={(stageName) => {
              if (stageName === 'Applied' || stageName === 'Screened') {
                setShowScreeningModal(true);
              }
            }}
          />

          {app.scores && <CandidateScorecard scores={app.scores} />}
        </div>

        <ApplicationActionSidebar
          app={app}
          offer={offer}
          nextSteps={nextSteps}
          onOpenScreeningModal={() => setShowScreeningModal(true)}
        />
      </div>

      <ScreeningAgentModal
        isOpen={showScreeningModal}
        onClose={() => setShowScreeningModal(false)}
        app={app}
        runningScreening={runningScreening}
        screeningError={screeningError}
        onRunScreening={handleRunScreening}
      />
    </div>
  );
}
