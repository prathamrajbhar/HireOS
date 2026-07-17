'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, ShieldCheck, ShieldAlert, Clock } from 'lucide-react';
import { Application } from '@/lib/mockData';

interface CandidateCardProps {
  app: Application;
}

export default function CandidateCard({ app }: CandidateCardProps) {
  const hasFlags = app.biasReport && app.biasReport.flaggedPhrases.length > 0;

  return (
    <div className="rounded-2xl border border-white/70 bg-white/55 p-3.5 shadow-sm hover:shadow-md transition-all glass-panel relative group hover:border-purple-200">
      {/* Header Info */}
      <div className="flex items-start gap-2.5">
        <Image
          src={app.candidateAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
          alt={app.candidateName}
          width={32}
          height={32}
          className="h-8 w-8 rounded-full border border-purple-100 shadow-sm object-cover"
          unoptimized
        />
        <div className="min-w-0 flex-1">
          <span className="text-xs font-black text-slate-800 block truncate leading-tight group-hover:text-purple-650 transition-colors">
            {app.candidateName}
          </span>
          <span className="text-[10px] text-slate-450 font-bold block mt-0.5 truncate select-all">
            {app.candidateEmail}
          </span>
        </div>

        {/* Composite Score */}
        {app.scores && (
          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex-shrink-0 select-none shadow-sm">
            {app.scores.composite}%
          </span>
        )}
      </div>

      {/* Bias Audit Report Badge */}
      {app.biasReport && (
        <div className="mt-2.5 flex items-center gap-1">
          {hasFlags ? (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md shadow-sm">
              <ShieldAlert className="h-3 w-3 text-amber-600" />
              Bias Audit: Warning
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md shadow-sm">
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              Bias Audit: Audited
            </span>
          )}
        </div>
      )}

      {/* Scorecard breakdown mini-bars */}
      {app.scores && (
        <div className="mt-3 space-y-2 border-t border-slate-100/50 pt-2.5 select-none">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[9px] font-bold text-slate-500">
            {/* Tech */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-slate-450">
                <span>Tech</span>
                <span className="text-slate-800 font-extrabold">{app.scores.technical}%</span>
              </div>
              <div className="h-1 w-full bg-slate-200/60 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500" style={{ width: `${app.scores.technical}%` }} />
              </div>
            </div>

            {/* Comm */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-slate-450">
                <span>Comm</span>
                <span className="text-slate-800 font-extrabold">{app.scores.communication}%</span>
              </div>
              <div className="h-1 w-full bg-slate-200/60 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: `${app.scores.communication}%` }} />
              </div>
            </div>

            {/* Logic */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-slate-450">
                <span>Logic</span>
                <span className="text-slate-800 font-extrabold">{app.scores.problemSolving}%</span>
              </div>
              <div className="h-1 w-full bg-slate-200/60 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${app.scores.problemSolving}%` }} />
              </div>
            </div>

            {/* Experience */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-slate-450">
                <span>Exp</span>
                <span className="text-slate-800 font-extrabold">{app.scores.experience}%</span>
              </div>
              <div className="h-1 w-full bg-slate-200/60 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: `${app.scores.experience}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Applied Time & Action Button */}
      <div className="mt-3.5 pt-2 border-t border-slate-100/50 flex justify-between items-center text-[10px] font-bold">
        <span className="text-slate-400 font-semibold flex items-center gap-0.5 select-none">
          <Clock className="h-3 w-3" />
          {app.appliedDate}
        </span>
        <Link
          href={`/hr/candidates/${app.id}`}
          className="text-indigo-650 hover:text-indigo-850 flex items-center gap-0.5 cursor-pointer"
        >
          Scoring Report
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
