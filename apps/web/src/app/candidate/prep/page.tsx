'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { mockPrepContent } from '@/lib/mockData';
import { Library, Search, ArrowRight } from 'lucide-react';

export default function CandidatePrepLibrary() {
  const [search, setSearch] = useState('');

  const filteredPrep = mockPrepContent.filter((prep) =>
    prep.companyName.toLowerCase().includes(search.toLowerCase()) ||
    prep.roleArchetype.toLowerCase().includes(search.toLowerCase())
  );

  const getDifficultyPill = (diff: string) => {
    const d = diff.toLowerCase();
    if (d.includes('hard') && d.includes('medium')) {
      return { text: diff, bg: 'bg-orange-50 text-orange-700 border-orange-100' };
    }
    if (d.includes('hard')) {
      return { text: diff, bg: 'bg-rose-50 text-rose-700 border-rose-100' };
    }
    return { text: diff, bg: 'bg-amber-50 text-amber-700 border-amber-100' };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* SaaS Page Header */}
      <div className="border-b border-slate-200/80 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest block mb-1">
            Intelligence Library
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Company Blueprints</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Study target culture blueprints and typical questions curated by the AI agent models.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by company (e.g. Google, Stripe)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200/80 bg-slate-50/40 focus:bg-white focus:outline-none focus:border-emerald-500 transition-all focus:ring-2 focus:ring-emerald-500/10 font-semibold"
        />
      </div>

      {/* Grid of Cards */}
      {filteredPrep.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPrep.map((prep) => {
            const pill = getDifficultyPill(prep.difficulty);
            return (
              <div
                key={prep.id}
                className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-slate-200/35 backdrop-blur-md glass-panel flex flex-col justify-between hover:scale-[1.01] hover:shadow-2xl transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200/60 text-slate-800 text-xl font-bold shadow-sm overflow-hidden p-1 flex-shrink-0">
                      {prep.logo.startsWith('http') || prep.logo.startsWith('/') ? (
                        <img src={prep.logo} alt={prep.companyName} className="h-full w-full object-contain" />
                      ) : (
                        prep.logo
                      )}
                    </span>
                    <div className="space-y-0.5">
                      <h3 className="font-extrabold text-slate-800 text-sm">{prep.companyName} Blueprint</h3>
                      <span className="inline-block text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {prep.roleArchetype}
                      </span>
                    </div>
                  </div>
                  
                  <p className="mt-4 text-xs text-slate-500 leading-relaxed font-semibold line-clamp-3">
                    {prep.cultureNotes}
                  </p>
                </div>

                <div className="mt-6 flex justify-between items-center border-t border-slate-100 pt-4">
                  <div className={`px-2.5 py-0.8 rounded-lg border text-[9px] font-bold uppercase tracking-wider ${pill.bg}`}>
                    {pill.text}
                  </div>
                  <Link
                    href={`/candidate/prep/${prep.id.replace('prep-', '')}/${prep.roleArchetype.toLowerCase().replace(/ /g, '-')}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
                  >
                    View Blueprint
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 rounded-3xl border border-dashed border-slate-300 bg-white/20 glass-panel">
          <Library className="h-10 w-10 text-slate-350 mx-auto mb-3" />
          <h3 className="text-lg font-black text-slate-700">No blueprints match your search</h3>
          <p className="text-xs text-slate-400 font-semibold mt-1">Try widening your keywords or checking spelling.</p>
        </div>
      )}
    </div>
  );
}
