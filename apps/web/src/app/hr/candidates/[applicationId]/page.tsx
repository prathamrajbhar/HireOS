'use client';

import React, { use, useEffect, useState } from 'react';
import { useApplication, useJob } from '@/hooks/queries';
import { apiClient } from '@/lib/apiClient';
import { AlertCircle } from '@/lib/lucide-google-icons';
import { CandidateHeader } from './components/CandidateHeader';
import { CandidateDetailSkeleton } from '@/components/ui';
import { ErrorState } from '@/components/ui/ErrorState';
import { ProctoringSummaryCard } from './components/ProctoringSummaryCard';
import { CandidateProfileBreadcrumbs } from './components/CandidateProfileBreadcrumbs';
import { CandidateDossierCard } from './components/CandidateDossierCard';
import { CandidateMetaCard } from './components/CandidateMetaCard';
import { CandidateProfileNotFound } from './components/CandidateProfileNotFound';
import { downloadCandidateResumePdf } from '@/lib/pdf/candidateResumePdf';
import type { ProctoringReport } from './components/ProctoringReportCard';

export default function HrCandidateProfilePage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = use(params);

  const { data: app, isLoading, isError, error, refetch } = useApplication(applicationId);
  const { data: job } = useJob(app?.jobId ?? null);
  const [proctorReport, setProctorReport] = useState<ProctoringReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!applicationId) return;
    apiClient
      .get<ProctoringReport>(`/proctoring/applications/${applicationId}/report`)
      .then((report) => {
        if (!cancelled && report) setProctorReport(report);
      })
      .catch(() => {
        if (!cancelled) setProctorReport(null);
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div className="w-full max-w-md">
          <ErrorState error={error} onRetry={refetch} />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <CandidateDetailSkeleton />;
  }

  if (!app) {
    return <CandidateProfileNotFound />;
  }

  const handleDownloadResume = async () => {
    await downloadCandidateResumePdf(app, job?.title || app.jobTitle);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12 font-sans">
      <CandidateProfileBreadcrumbs
        jobId={app.jobId}
        applicationId={app.id}
        candidateName={app.candidateName}
      />

      <CandidateHeader app={app} />

      {app.status === 'rejected' && (
        <div className="rounded-3xl border border-rose-200/90 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/40 p-5 md:p-6 shadow-md backdrop-blur-md glass-panel flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-rose-950 dark:text-rose-200 font-display">
                  Candidate Application Rejected
                </h3>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-200/70 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 uppercase">
                  Rejected
                </span>
              </div>
              <p className="text-xs text-rose-900 dark:text-rose-300 font-semibold mt-1 leading-relaxed">
                <span className="font-extrabold uppercase text-[10px] tracking-wider text-rose-700 dark:text-rose-400 mr-1.5">
                  Rejection Reason:
                </span>
                {app.rejectionReason || app.reasoning || 'Candidate did not meet required threshold.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <CandidateDossierCard app={app} onDownloadResume={handleDownloadResume} />
        </div>

        <div className="space-y-6">
          <ProctoringSummaryCard applicationId={app.id} report={proctorReport} />
          <CandidateMetaCard app={app} job={job} />
        </div>
      </div>
    </div>
  );
}
