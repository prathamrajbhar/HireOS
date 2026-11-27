'use client';

import React from 'react';
import Image from 'next/image';
import { ChevronRight, Clock } from '@/lib/lucide-google-icons';
import { Application } from '@/types';

interface CandidateCardProps {
  app: Application;
  onSelectCandidate?: (app: Application) => void;
}

export default function CandidateCard({ app, onSelectCandidate }: CandidateCardProps) {
  const handleClick = () => {
    if (onSelectCandidate) {
      onSelectCandidate(app);
    }
  };

  const rejectionText = app.rejectionReason || app.reasoning;
  const scoreMetrics = app.scores
    ? [
        { label: 'Tech', value: app.scores.technical, color: 'bg-indigo-500' },
        { label: 'Comm', value: app.scores.communication, color: 'bg-purple-500' },
        { label: 'Logic', value: app.scores.problemSolving, color: 'bg-emerald-500' },
        { label: 'Exp', value: app.scores.experience, color: 'bg-amber-500' },
      ]
    : [];

  return (
    <div
      onClick={handleClick}
      className="rounded-2xl border border-white/60 dark:border-slate-800 bg-white/55 dark:bg-slate-900/60 p-3.5 shadow-sm hover:shadow-md transition-all glass-panel relative group hover:border-brand-300 dark:hover:border-orange-500/50 cursor-pointer select-none"
    >
      <div className="flex items-start gap-2.5">
        {app.candidateAvatar ? (
          <Image
            src={app.candidateAvatar}
            alt={app.candidateName}
            width={36}
            height={36}
            className="h-9 w-9 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs object-cover flex-shrink-0"
            unoptimized
          />
        ) : (
          <div className="h-9 w-9 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center bg-brand-50 dark:bg-orange-950/60 text-brand-600 dark:text-orange-400 font-black text-xs flex-shrink-0">
            {(app.candidateName || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate leading-tight group-hover:text-brand-600 dark:group-hover:text-orange-400 transition-colors font-display">
              {app.candidateName}
            </span>
            {app.status === 'rejected' ? (
              <span className="text-[9px] font-extrabold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200/60 dark:border-rose-900/60 flex-shrink-0 shadow-2xs uppercase">
                Rejected
              </span>
            ) : app.scores ? (
              <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-900/60 flex-shrink-0 shadow-2xs">
                {app.scores.composite}%
              </span>
            ) : null}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5 truncate">
            {app.candidateEmail}
          </span>
        </div>
      </div>

      {app.status === 'rejected' && rejectionText && (
        <div
          className="mt-2.5 rounded-xl border border-rose-200/60 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/35 px-2.5 py-1.5"
          title={rejectionText}
        >
          <p className="text-[10px] leading-relaxed text-rose-600 dark:text-rose-300 font-medium line-clamp-2 overflow-hidden">
            {rejectionText}
          </p>
        </div>
      )}

      {app.scores && (
        <div className="mt-3 space-y-2 border-t border-slate-200/60 dark:border-slate-800 pt-2.5">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[9px] font-bold text-slate-500 dark:text-slate-400">
            {scoreMetrics.map((metric) => (
              <div key={metric.label} className="space-y-0.5">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{metric.label}</span>
                  <span className="text-slate-900 dark:text-slate-100 font-extrabold">{metric.value}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200/60 dark:bg-slate-800/60 rounded-full overflow-hidden">
                  <div className={`h-full ${metric.color} rounded-full`} style={{ width: `${metric.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex justify-between items-center gap-2 text-[10px] font-extrabold">
        <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1 whitespace-nowrap">
          <Clock className="h-3 w-3 text-slate-400 flex-shrink-0" />
          {app.appliedDate}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className="text-brand-600 dark:text-orange-400 hover:text-brand-700 dark:hover:text-orange-300 font-extrabold hover:underline flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
        >
          <span>Scoring Report</span>
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
        </button>
      </div>
    </div>
  );
}
