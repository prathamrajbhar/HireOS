'use client';

import React, { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { mockSessions } from '@/lib/mockData';
import { CheckCircle2, ChevronRight, Mic, Compass, Sparkles, MessageSquare, Activity, Layers, LayoutDashboard } from '@/lib/lucide-google-icons';
import { getCompanyDomain } from '@/utils/logo';

export default function MockFeedbackPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const defaultSession = mockSessions.find((s) => s.id === sessionId) || mockSessions[0];
  const [session, setSession] = useState(defaultSession);

  useEffect(() => {
    const defaultSessionObj = mockSessions.find((s) => s.id === sessionId) || mockSessions[0];
    const localData = localStorage.getItem(`mockSession_${sessionId}`);
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        const nextSession = {
          id: sessionId,
          targetCompany: defaultSessionObj.targetCompany,
          targetRole: defaultSessionObj.targetRole,
          difficulty: defaultSessionObj.difficulty,
          rubric: parsed.rubric,
          score: parsed.score,
          date: defaultSessionObj.date,
          feedback: parsed.feedback,
          transcript: parsed.transcript,
        };
        setTimeout(() => setSession(nextSession), 0);
      } catch {
        setTimeout(() => setSession(defaultSessionObj), 0);
      }
    } else {
      setTimeout(() => setSession(defaultSessionObj), 0);
    }
  }, [sessionId]);

  const performance = session.score >= 85 
    ? { text: 'Excellent Match', bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/60' }
    : session.score >= 75 
      ? { text: 'Strong Match', bg: 'bg-brand-50 dark:bg-orange-950/60 text-brand-700 dark:text-orange-300 border-brand-100 dark:border-orange-900/60' }
      : { text: 'Needs Calibration', bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/60' };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-400">
        <Link href="/candidate/dashboard" className="hover:text-emerald-600 dark:hover:text-emerald-400">Dashboard</Link>
        <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />
        <Link href="/candidate/mock/new" className="hover:text-emerald-600 dark:hover:text-emerald-400">Mock Practice</Link>
        <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />
        <span className="text-slate-700 dark:text-slate-200">Report</span>
      </div>

      {/* Scorecard Header */}
      <div className="glass-card p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex gap-4 items-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 shadow-sm overflow-hidden flex-shrink-0">
            <img src={`https://logo.clearbit.com/${getCompanyDomain(session.targetCompany)}`} alt={session.targetCompany} className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
          </span>
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-brand-700 dark:text-orange-300 bg-brand-50 dark:bg-orange-950/60 border border-brand-100 dark:border-orange-900/60">
              <Sparkles className="h-2.5 w-2.5" /> Evaluator Analysis
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{session.targetRole} Mock Session</h1>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mt-0.5">Target blueprint: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{session.targetCompany}</span></span>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-50/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 p-4 rounded-2xl">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Practice Score</span>
            <div className="flex items-baseline gap-1 mt-0.5"><span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{session.score}%</span><span className="text-xs font-bold text-slate-400 dark:text-slate-500">/ 100</span></div>
          </div>
          <span className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-bold tracking-wide uppercase ${performance.bg}`}>{performance.text}</span>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Summary & Transcript */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-6 shadow-md backdrop-blur-md">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-4 flex items-center gap-1.5"><MessageSquare className="h-4 w-4 text-emerald-500" />Coaching Feedback</h3>
            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-semibold italic border-l-4 border-emerald-500 pl-4 py-2 bg-slate-50/60 dark:bg-slate-800/60 rounded-r-xl">&ldquo;{session.feedback}&rdquo;</p>
          </div>

          {session.transcript.length > 0 && (
            <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-6 shadow-md backdrop-blur-md space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2.5 flex items-center gap-1.5"><Layers className="h-4 w-4 text-brand-500 dark:text-orange-400" />Annotated Interview Transcript</h3>
              <div className="space-y-5 divide-y divide-slate-100 dark:divide-slate-800 pt-2">
                {session.transcript.map((item, idx) => (
                  <div key={idx} className={idx > 0 ? 'pt-5' : ''}>
                    <span className="inline-flex items-center justify-center h-4.5 px-2 rounded-md bg-brand-50 dark:bg-orange-950/60 border border-brand-100 dark:border-orange-900/60 text-[9px] font-bold text-brand-700 dark:text-orange-300 uppercase">Question {idx + 1}</span>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 mt-2 leading-relaxed">{item.question}</p>
                    <div className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 p-4 rounded-2xl mt-2.5 text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-semibold shadow-inner"><span className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase block mb-1">Your Answer</span>{item.answer}</div>
                    <div className="flex items-start gap-2.5 mt-3 bg-emerald-50/30 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/50 text-[11px] text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5 animate-pulse" />
                      <div><span className="text-slate-800 dark:text-slate-100 font-bold">Feedback Calibration: </span>{item.feedback}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Category Metrics & CTAs */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-6 shadow-md backdrop-blur-md space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2.5 flex items-center gap-1.5"><Activity className="h-4 w-4 text-brand-500 dark:text-orange-400" />Category Metrics</h3>
            <div className="space-y-5 pt-1">
              {[
                { name: 'Technical Logic', val: session.rubric.technical, desc: 'Code structure, accuracy, and big-O analysis.' },
                { name: 'Communication', val: session.rubric.communication, desc: 'Explanation structure, pacing, and delivery speed.' },
                { name: 'Culture Alignment', val: session.rubric.cultureFit, desc: 'Gaze focus, engagement signals, and company principles.' }
              ].map((m) => (
                <div key={m.name}>
                  <div className="flex justify-between text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1"><span>{m.name}</span><span className="text-brand-600 dark:text-orange-400">{m.val}%</span></div>
                  <div className="w-full bg-slate-200/50 dark:bg-slate-800/60 rounded-full h-2"><div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full" style={{ width: `${m.val}%` }} /></div>
                  <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-400 block mt-1">{m.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-5 shadow-md backdrop-blur-md space-y-3 text-center">
            <Link href="/candidate/mock/new" className="w-full flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold py-3 text-xs shadow-md"><Mic className="h-4 w-4" />Practice Another Company</Link>
            <Link href="/candidate/jobs" className="w-full flex items-center justify-center gap-1.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold py-3 text-xs shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700"><Compass className="h-4 w-4 text-slate-400 dark:text-slate-400" />Browse Open Jobs</Link>
            <Link href="/candidate/dashboard" className="w-full flex items-center justify-center gap-1.5 rounded-2xl bg-slate-100/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border border-slate-200/40 dark:border-slate-700 font-bold py-3 text-xs shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700"><LayoutDashboard className="h-4 w-4 text-slate-400 dark:text-slate-400" />Back to Dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
