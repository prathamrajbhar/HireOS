'use client';

import React from 'react';
import { cn } from '@/lib/cn';

export type BadgeIntent = 'neutral' | 'indigo' | 'purple' | 'emerald' | 'amber' | 'rose' | 'sky';

const intentClasses: Record<BadgeIntent, string> = {
  neutral: 'bg-slate-100/80 text-slate-600 border-slate-200/80',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  rose: 'bg-rose-50 text-rose-600 border-rose-100',
  sky: 'bg-sky-50 text-sky-600 border-sky-100',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  intent?: BadgeIntent;
  size?: 'xs' | 'sm';
  dot?: boolean;
  icon?: React.ReactNode;
}

export function Badge({
  className,
  intent = 'neutral',
  size = 'xs',
  dot = false,
  icon,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-bold border rounded-md shadow-sm select-none whitespace-nowrap',
        size === 'xs' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        intentClasses[intent],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            intent === 'neutral' && 'bg-slate-400',
            intent === 'indigo' && 'bg-indigo-500',
            intent === 'purple' && 'bg-purple-500',
            intent === 'emerald' && 'bg-emerald-500',
            intent === 'amber' && 'bg-amber-500',
            intent === 'rose' && 'bg-rose-500',
            intent === 'sky' && 'bg-sky-500'
          )}
        />
      )}
      {icon}
      {children}
    </span>
  );
}

/** Maps common application/job status strings to a sensible badge intent. */
export function statusToIntent(status: string): BadgeIntent {
  const s = status.toLowerCase();
  if (['hired', 'active', 'audited', 'confirmed', 'completed', 'passed'].some((k) => s.includes(k))) return 'emerald';
  if (['rejected', 'closed', 'failed', 'declined'].some((k) => s.includes(k))) return 'rose';
  if (['warning', 'flagged', 'hold', 'pending'].some((k) => s.includes(k))) return 'amber';
  if (['draft', 'scheduled'].some((k) => s.includes(k))) return 'sky';
  if (['interview', 'screening'].some((k) => s.includes(k))) return 'purple';
  return 'neutral';
}
