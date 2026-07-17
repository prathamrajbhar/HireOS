'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import { Sparkles, Brain, Cpu, ShieldCheck, Clock, ArrowLeftRight, User } from 'lucide-react';

export default function LandingPage() {
  const [activeAudience, setActiveAudience] = useState<'companies' | 'candidates'>('companies');

  return (
    <div className="flex flex-col min-h-screen">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-16 text-center lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 mb-6 glass-panel">
            <Sparkles className="h-3.5 w-3.5" />
            Automated Hiring. Fast, simple, and fair.
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 bg-clip-text">
            The AI-Native <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Recruitment Marketplace</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
            Post jobs, apply once, and let AI schedule, interview, and match candidates. Complete from start to hire in 72 hours.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/signup?role=hr"
              className="rounded-full bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-150 hover:bg-indigo-700 transition-all hover:scale-[1.02]"
            >
              Post a Job (Companies)
            </Link>
            <Link
              href="/signup?role=candidate"
              className="rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 transition-all hover:scale-[1.02] glass-panel"
            >
              Find a Job (Candidates)
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 mb-20 w-full">
        <div className="glass-card p-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <span className="block text-4xl font-extrabold text-indigo-600">72 Hrs</span>
            <span className="mt-1 block text-sm font-semibold text-slate-500">Average Time-to-Hire</span>
          </div>
          <div className="border-y md:border-y-0 md:border-x border-slate-100 py-6 md:py-0">
            <span className="block text-4xl font-extrabold text-purple-600">0 Steps</span>
            <span className="mt-1 block text-sm font-semibold text-slate-500">Manual Screenings Required</span>
          </div>
          <div>
            <span className="block text-4xl font-extrabold text-emerald-600">100%</span>
            <span className="mt-1 block text-sm font-semibold text-slate-500">Bias-Audited Evaluations</span>
          </div>
        </div>
      </section>

      {/* Audience Toggle & How it Works */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 mb-24 w-full">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            How HireOS Works
          </h2>
          <p className="mt-3 text-slate-600 text-sm">
            Select an option to see the automated pipeline in action.
          </p>

          {/* Toggle buttons */}
          <div className="inline-flex p-1 rounded-full bg-white/35 border border-white/60 mt-6 select-none backdrop-blur-md">
            <button
              onClick={() => setActiveAudience('companies')}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${activeAudience === 'companies'
                ? 'bg-indigo-500/90 text-white shadow-sm'
                : 'text-slate-655 hover:text-slate-800'
                }`}
            >
              For Companies
            </button>
            <button
              onClick={() => setActiveAudience('candidates')}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${activeAudience === 'candidates'
                ? 'bg-indigo-500/90 text-white shadow-sm'
                : 'text-slate-655 hover:text-slate-800'
                }`}
            >
              For Candidates
            </button>
          </div>
        </div>

        {/* Steps strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {activeAudience === 'companies' ? (
            <>
              {/* Company Step 1 */}
              <div className="glass-card glass-card-indigo p-6 relative group">
                <span className="absolute top-4 right-4 text-3xl font-extrabold text-indigo-100 group-hover:text-indigo-200 transition-colors">01</span>
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-150 mb-4">
                  <Brain className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Post Job & Scoring</h3>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  Upload a job description. The AI instantly creates a custom scoring guide.
                </p>
              </div>
              {/* Company Step 2 */}
              <div className="glass-card glass-card-purple p-6 relative group">
                <span className="absolute top-4 right-4 text-3xl font-extrabold text-indigo-100 group-hover:text-indigo-200 transition-colors">02</span>
                <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-150 mb-4">
                  <Cpu className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-800">AI Voice Interviews</h3>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  AI agents schedule and run live voice interviews, recording answers automatically.
                </p>
              </div>
              {/* Company Step 3 */}
              <div className="glass-card glass-card-emerald p-6 relative group">
                <span className="absolute top-4 right-4 text-3xl font-extrabold text-indigo-100 group-hover:text-indigo-200 transition-colors">03</span>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-150 mb-4">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Review Shortlist</h3>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  Check AI scores, read interview transcripts, listen to audio, and send job offers instantly.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Candidate Step 1 */}
              <div className="glass-card glass-card-emerald p-6 relative group">
                <span className="absolute top-4 right-4 text-3xl font-extrabold text-indigo-100 group-hover:text-indigo-200 transition-colors">01</span>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-150 mb-4">
                  <User className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Create One Profile</h3>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  Upload your resume. Our system reads it to build your professional profile.
                </p>
              </div>
              {/* Candidate Step 2 */}
              <div className="glass-card glass-card-indigo p-6 relative group">
                <span className="absolute top-4 right-4 text-3xl font-extrabold text-indigo-100 group-hover:text-indigo-200 transition-colors">02</span>
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-150 mb-4">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Prepare & Practice</h3>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  Practice mock interviews, browse prep guides, and view company question banks.
                </p>
              </div>
              {/* Candidate Step 3 */}
              <div className="glass-card glass-card-purple p-6 relative group">
                <span className="absolute top-4 right-4 text-3xl font-extrabold text-indigo-100 group-hover:text-indigo-200 transition-colors">03</span>
                <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-150 mb-4">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Apply Instantly</h3>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  Apply with one click, run dynamic voice interviews, and track status updates.
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Feature Highlights Section */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 mb-24 w-full">
        <div className="glass-card p-8 md:p-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Enterprise Interview Infrastructure</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
              Explainable decisions with built-in Bias Audit reports
            </h2>
            <p className="mt-4 text-slate-600 text-sm leading-relaxed">
              Every recruiting action taken by our agents is logged. When our Evaluator Agent scores a transcript, it runs a second-pass bias audit that flags linguistic anomalies and normalizes school/location bias, providing absolute auditing reports for HR visibility.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-bold text-slate-700">Strict Organization Tenant Data Isolation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-bold text-slate-700">Opt-in identity and camera check signals</span>
              </div>
            </div>
          </div>
          <div className="glass-card glass-card-indigo p-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <span className="text-xs font-bold text-slate-800">Evaluation Scoring Engine</span>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">Active</span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-extrabold text-slate-705 mb-1">
                  <span>Technical Rubric</span>
                  <span>92/100</span>
                </div>
                <div className="w-full bg-white/45 border border-white/20 rounded-full h-2 shadow-inner p-0.5">
                  <div className="bg-indigo-500 h-1 rounded-full transition-all duration-500" style={{ width: '92%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-extrabold text-slate-705 mb-1">
                  <span>Communication Skills</span>
                  <span>85/100</span>
                </div>
                <div className="w-full bg-white/45 border border-white/20 rounded-full h-2 shadow-inner p-0.5">
                  <div className="bg-indigo-500 h-1 rounded-full transition-all duration-500" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-extrabold text-slate-705 mb-1">
                  <span>Audited Bias Variance</span>
                  <span className="text-emerald-600">0.0% deviation</span>
                </div>
                <div className="w-full bg-white/45 border border-white/20 rounded-full h-2 shadow-inner p-0.5">
                  <div className="bg-emerald-500 h-1 rounded-full transition-all duration-500" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
