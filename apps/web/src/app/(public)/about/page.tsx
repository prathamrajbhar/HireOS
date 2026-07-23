'use client';

import React from 'react';
import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import { Target, Layers, Scale } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicNavbar />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 flex-1 w-full">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-bold text-indigo-600 dark:text-orange-400 uppercase tracking-widest">Our Mission</span>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-2">
            Equal Vetting, Instant Decisions
          </h1>
          <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
            NextRound replaces slow, biased manual sourcing processes with structured evaluation rubrics and automated, explainable voice interviews.
          </p>
        </div>

        {/* Info Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="rounded-3xl border border-white/60 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/40 p-6 md:p-8 shadow-sm backdrop-blur-md glass-panel flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 mb-4">
                <Target className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">The Problem We Solve</h2>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                Average hiring cycles consume more than 30 days of HR overhead. During resume reviews and panel interviews, systemic unconscious biases—based on gender, names, locations, and university tiers—often screen out qualified developers.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/60 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/40 p-6 md:p-8 shadow-sm backdrop-blur-md glass-panel flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-orange-950/40 flex items-center justify-center text-purple-600 dark:text-orange-400 border border-purple-100 dark:border-orange-900/50 mb-4">
                <Layers className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">The Marketplace Solution</h2>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                By standardizing qualifications on a single reusable profile, candidates can apply to multiple jobs instantly. Vetting is automated via structured AI voice sessions, allowing candidates to practice beforehand using the Mock Interview Agent.
              </p>
            </div>
          </div>
        </div>

        {/* Bias-Audit Explainer Section */}
        <div className="rounded-3xl border border-white/60 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/40 p-8 shadow-md backdrop-blur-md glass-panel mb-16">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/50 pb-4 mb-6">
            <Scale className="h-6 w-6 text-indigo-600 dark:text-orange-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">How the AI Bias Audit Works</h2>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="h-6 w-6 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Marker Anonymization</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1 font-semibold">
                  The Sourcing and Screening Agents strip personal candidate markers—such as name, gender, age, and profile photos—before routing applications to scoring logic.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="h-6 w-6 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Double-Pass Evaluation Check</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1 font-semibold">
                  Once the Evaluator Agent grades a voice transcript, a secondary Audit Agent reviews the scores against past historical logs, scanning for deviations linked to specific backgrounds or writing styles.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="h-6 w-6 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Full Auditable Transparency</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1 font-semibold">
                  Every decision compiles a comprehensive reasoning log. HR receives a detailed PDF explaining the exact criteria matches, while candidates receive coaching feedback on their performance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
