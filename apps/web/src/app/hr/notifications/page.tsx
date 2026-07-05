'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, ArrowRight } from 'lucide-react';

export default function HrNotificationsPage() {
  const notifications = [
    { id: 1, type: 'pipeline', text: 'Screening Agent shortlisted 4 candidates for Senior Frontend Engineer.', time: '2 mins ago', link: '/hr/jobs/job-101/pipeline' },
    { id: 2, type: 'decision', text: 'Decision Agent held Vikram Malhotra for review (composite: 74%).', time: '10 mins ago', link: '/hr/candidates/app-502' },
    { id: 3, type: 'alert', text: 'Interviewer Agent completed interview replay stream for Ananya Iyer.', time: '1 hour ago', link: '/hr/candidates/app-501/interview' }
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200">
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Bell className="h-6 w-6 text-purple-600" />
          System Notifications
        </h1>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Review critical events triggered by pipeline and evaluation agents.
        </p>
      </div>

      <div className="rounded-3xl border border-white/60 bg-white/45 p-6 shadow-md backdrop-blur-md glass-panel space-y-4">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-slate-100 bg-white/50 text-xs font-semibold text-slate-700 hover:shadow-sm transition-all"
          >
            <div className="flex gap-3">
              {n.type === 'pipeline' ? (
                <span className="h-6 w-6 rounded-lg bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600 font-bold text-[10px] mt-0.5">
                  PL
                </span>
              ) : n.type === 'decision' ? (
                <span className="h-6 w-6 rounded-lg bg-purple-50 border border-purple-150 flex items-center justify-center text-purple-600 font-bold text-[10px] mt-0.5">
                  DE
                </span>
              ) : (
                <span className="h-6 w-6 rounded-lg bg-amber-50 border border-amber-150 flex items-center justify-center text-amber-600 font-bold text-[10px] mt-0.5">
                  AL
                </span>
              )}
              <div>
                <p className="text-slate-800 leading-relaxed">{n.text}</p>
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">{n.time}</span>
              </div>
            </div>
            <Link
              href={n.link}
              className="inline-flex items-center gap-0.5 text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors mt-0.5 flex-shrink-0"
            >
              Details
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
