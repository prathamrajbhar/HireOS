'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { mockPrepContent } from '@/lib/mockData';
import { ChevronRight, Mic, BookOpen, Layers } from 'lucide-react';

export default function CandidatePrepDetailPage({ params }: { params: Promise<{ companyId: string; roleArchetype: string }> }) {
  const { companyId } = use(params);
  
  // Find blueprint matches
  const prep = mockPrepContent.find((p) => p.id.includes(companyId)) || mockPrepContent[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
        <Link href="/candidate/prep" className="hover:text-emerald-600 transition-colors">Interview Guides</Link>
        <ChevronRight className="h-3 w-3 text-slate-300" />
        <span className="text-slate-700">{prep.companyName} {prep.roleArchetype}</span>
      </div>

      {/* Header Overview Card */}
      <div className="rounded-3xl border border-white/60 bg-white/70 p-6 sm:p-8 shadow-xl shadow-slate-200/40 backdrop-blur-md glass-panel flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-slate-200/60 text-3xl shadow-sm overflow-hidden p-1 flex-shrink-0">
            {prep.logo.startsWith('http') || prep.logo.startsWith('/') ? (
              <img src={prep.logo} alt={prep.companyName} className="h-full w-full object-contain" />
            ) : (
              prep.logo
            )}
          </span>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {prep.companyName} Interview Guide
            </h1>
            <span className="inline-block text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-md uppercase tracking-wider">
              {prep.roleArchetype}
            </span>
          </div>
        </div>

        <Link
          href={`/candidate/mock/new?company=${prep.companyName}&role=${prep.roleArchetype}`}
          className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold px-5 py-3 text-xs shadow-md shadow-emerald-100 hover:shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01]"
        >
          <Mic className="h-4.5 w-4.5 animate-pulse" />
          Practice Mock Session
        </Link>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Questions Bank */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 md:p-8 shadow-md backdrop-blur-md glass-panel space-y-6">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-indigo-500" />
              Likely Interview Questions
            </h3>
            
            <div className="space-y-6">
              {prep.questions.map((item, idx) => (
                <div key={idx} className="space-y-3.5">
                  <div className="flex gap-3">
                    <span className="h-5 w-5 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 flex-shrink-0 mt-0.5 shadow-sm">
                      Q
                    </span>
                    <h4 className="text-xs font-extrabold text-slate-800 leading-relaxed">{item.question}</h4>
                  </div>
                  
                  <div className="pl-8 space-y-2.5">
                    <div className="bg-slate-50/50 border border-slate-150 p-4 rounded-2xl text-[11px] font-semibold text-slate-500 leading-relaxed shadow-inner">
                      <span className="text-slate-800 font-bold block mb-1">Rubric Evaluation Goal:</span>
                      {item.tip}
                    </div>
                    <div className="bg-emerald-50/30 border border-emerald-100/50 p-4 rounded-2xl text-[11px] font-semibold text-slate-655 leading-relaxed italic shadow-inner">
                      <span className="text-emerald-700 font-bold block mb-1">Model Recommended Answer:</span>
                      &ldquo;{item.sampleAnswer}&rdquo;
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Culture Details */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-md backdrop-blur-md glass-panel space-y-3">
            <div className="flex items-center gap-1.5 text-indigo-600 border-b border-slate-100 pb-2.5">
              <BookOpen className="h-4.5 w-4.5 text-indigo-500" />
              <h3 className="text-sm font-black text-slate-900">Culture & Focus</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              {prep.cultureNotes}
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
