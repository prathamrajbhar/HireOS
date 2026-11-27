'use client';

import React from 'react';
import { Sparkles } from '@/lib/lucide-google-icons';
import {
  calculateOfferTimeProgress,
  calculateZeroHumanHiresProgress,
} from './analytics.config';

interface AiAccuracyCardProps {
  avgTimeToOfferDays: number | null | undefined;
  zeroHumanHires: number | null | undefined;
  totalHires?: number | null | undefined;
}

export function AiAccuracyCard({
  avgTimeToOfferDays,
  zeroHumanHires,
  totalHires,
}: AiAccuracyCardProps) {
  const hasAvgTimeToOffer =
    typeof avgTimeToOfferDays === 'number' && Number.isFinite(avgTimeToOfferDays);
  const hasZeroHumanHires =
    typeof zeroHumanHires === 'number' && Number.isFinite(zeroHumanHires);

  const avgTimeToOfferDisplay = hasAvgTimeToOffer
    ? `${avgTimeToOfferDays.toFixed(1)} days`
    : 'N/A';
  const zeroHumanHiresDisplay = hasZeroHumanHires ? `${zeroHumanHires}` : 'N/A';

  const offerTimeProgress = calculateOfferTimeProgress(avgTimeToOfferDays);
  const zeroHumanProgress = calculateZeroHumanHiresProgress(zeroHumanHires, totalHires);

  return (
    <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/45 dark:bg-slate-900/60 p-6 shadow-md backdrop-blur-md glass-panel space-y-4">
      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 border-b border-slate-200/60 dark:border-slate-800 pb-2.5 font-display flex items-center gap-2">
        <Sparkles className="h-4.5 w-4.5 text-brand-600 dark:text-orange-400" />
        AI Accuracy &amp; Candidate Rating
      </h3>

      <div className="space-y-4 text-xs font-semibold">
        <div>
          <div className="flex justify-between text-slate-800 dark:text-slate-200 mb-1 font-extrabold">
            <span>Average Time to Offer</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              {avgTimeToOfferDisplay}
            </span>
          </div>
          <div className="w-full bg-slate-200/60 dark:bg-slate-800/60 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${offerTimeProgress}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-slate-800 dark:text-slate-200 mb-1 font-extrabold">
            <span>Zero-Human-Touch Hires</span>
            <span className="text-indigo-600 dark:text-indigo-400">
              {zeroHumanHiresDisplay}
            </span>
          </div>
          <div className="w-full bg-slate-200/60 dark:bg-slate-800/60 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${zeroHumanProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
