'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Award, MessageSquare, Download, FileText } from '@/lib/lucide-google-icons';
import { Application } from '@/types';
import { CandidateDrawerHeader } from './CandidateDrawerHeader';
import { CandidateDrawerResumeTab } from './CandidateDrawerResumeTab';
import { CandidateDrawerScorecardTab } from './CandidateDrawerScorecardTab';
import { CandidateDrawerTranscriptTab } from './CandidateDrawerTranscriptTab';
import { ResumeDownloadLink } from '@/components/hr/ResumeDownloadLink';

interface CandidateProfileDrawerProps {
  app: Application | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CandidateProfileDrawer({
  app,
  isOpen,
  onClose,
}: CandidateProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState<'resume' | 'scorecard' | 'transcript'>('resume');

  if (!isOpen || !app) return null;

  return (
    <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-xl h-full bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between z-10 animate-in slide-in-from-right duration-300 font-sans">
        <CandidateDrawerHeader
          app={app}
          onClose={onClose}
        />

        <div className="h-11 px-6 bg-slate-100/70 dark:bg-[#161f30] border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-6 text-xs font-bold text-slate-500 dark:text-slate-400 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('resume')}
            className={`h-full flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'resume'
                ? 'border-brand-600 dark:border-brand-500 text-brand-700 dark:text-white font-extrabold'
                : 'hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4 text-brand-600 dark:text-brand-500" /> Resume &amp; Profile Dossier
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scorecard')}
            className={`h-full flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'scorecard'
                ? 'border-brand-600 dark:border-brand-500 text-brand-700 dark:text-white font-extrabold'
                : 'hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Award className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> AI Scorecard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('transcript')}
            className={`h-full flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'transcript'
                ? 'border-brand-600 dark:border-brand-500 text-brand-700 dark:text-white font-extrabold'
                : 'hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Q&amp;A Telemetry
          </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto space-y-5 text-xs bg-white dark:bg-[#111827]">
          {activeTab === 'resume' && (
            <CandidateDrawerResumeTab app={app} />
          )}
          {activeTab === 'scorecard' && <CandidateDrawerScorecardTab app={app} />}
          {activeTab === 'transcript' && <CandidateDrawerTranscriptTab app={app} />}
        </div>

        <div className="p-4 md:p-5 bg-slate-50/90 dark:bg-[#0b0f19] border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ResumeDownloadLink
              applicationId={app.id}
              resumeUrl={app.resumeUrl}
              className="px-3.5 py-2.5 rounded-xl bg-brand-600 dark:bg-orange-600 hover:bg-brand-700 dark:hover:bg-orange-700 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Resume PDF</span>
            </ResumeDownloadLink>
            <Link
              href={`/hr/candidates/${app.id}/scoring`}
              className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-200 dark:border-slate-700 shadow-2xs"
            >
              <span>Scoring Report</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
