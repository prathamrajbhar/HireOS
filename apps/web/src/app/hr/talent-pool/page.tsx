'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { mockApplications } from '@/lib/mockData';
import { Search, ChevronRight, Users, Filter, UserCheck, Brain } from 'lucide-react';
import Image from 'next/image';

export default function HrTalentPoolPage() {
  const [search, setSearch] = useState('');
  const [minScore, setMinScore] = useState<number>(70);
  const [selectedSkill, setSelectedSkill] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Derive unique skills and statuses for filter dropdowns
  const allSkills = Array.from(
    new Set(mockApplications.flatMap((app) => app.skills || []))
  ).sort();

  const allStatuses = Array.from(
    new Set(mockApplications.map((app) => app.status))
  ).sort();

  const filteredCandidates = mockApplications.filter((app) => {
    const nameMatch = app.candidateName.toLowerCase().includes(search.toLowerCase()) ||
      app.candidateEmail.toLowerCase().includes(search.toLowerCase());
    
    const compositeScore = app.scores?.composite || 75;
    const scoreMatch = compositeScore >= minScore;
    
    const skillMatch = selectedSkill === 'All' || app.skills.includes(selectedSkill);
    const statusMatch = selectedStatus === 'All' || app.status === selectedStatus;

    return nameMatch && scoreMatch && skillMatch && statusMatch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Console Top branding */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/45 pb-5">
        <div>
          <span className="text-xs font-bold text-purple-600 uppercase tracking-widest block mb-1">
            Recruiter Console
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Talent Pool Directory</h1>
          <p className="text-xs text-slate-555 font-semibold mt-1">
            Browse candidate profiles, scores, and candidate information.
          </p>
        </div>
      </div>

      {/* Sourcing AI Scout recommendations box */}
      <div className="bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-100 rounded-3xl p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
        <div className="flex gap-4 items-start">
          <Brain className="h-9 w-9 text-purple-650 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <h4 className="text-xs font-black text-purple-900 uppercase tracking-wide">AI Sourcing Scout Insights</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed font-semibold max-w-2xl">
              Found <strong>3 candidates</strong> exceeding a 90% technical logic match rate with active pipeline slots. Origin bias audits have successfully run across all parsed profiles.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setMinScore(90);
            setSelectedSkill('React');
          }}
          className="rounded-xl border border-purple-200 bg-white hover:bg-purple-50 px-4 py-2 text-[10px] font-black text-purple-700 shadow-sm transition-all whitespace-nowrap cursor-pointer hover:scale-[1.01]"
        >
          Apply Scout Filters
        </button>
      </div>

      {/* Filter bar console */}
      <div className="rounded-3xl border border-white/60 bg-white/45 p-6 shadow-md backdrop-blur-md glass-panel grid grid-cols-1 sm:grid-cols-4 gap-4">
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white/70 focus:outline-none focus:border-purple-500 transition-all font-semibold"
          />
        </div>

        {/* Skill dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <select
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value)}
            className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white/70 focus:outline-none focus:border-purple-500 font-semibold cursor-pointer"
          >
            <option value="All">All Skills</option>
            {allSkills.map((sk) => (
              <option key={sk} value={sk}>{sk}</option>
            ))}
          </select>
        </div>

        {/* Status dropdown */}
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white/70 focus:outline-none focus:border-purple-500 font-semibold cursor-pointer"
          >
            <option value="All">All Statuses</option>
            {allStatuses.map((st) => (
              <option key={st} value={st}>{st.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        {/* Score filter slider */}
        <div className="space-y-1.5 flex flex-col justify-center">
          <div className="flex justify-between text-[10px] font-bold text-slate-500 px-1">
            <span>MIN SCORE</span>
            <span className="text-purple-600 font-extrabold">{minScore}%</span>
          </div>
          <input
            type="range"
            min="50"
            max="95"
            step="5"
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-full accent-purple-650 h-1 bg-slate-200 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Candidates List grid */}
      {filteredCandidates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCandidates.map((app) => {
            const composite = app.scores?.composite || 75;
            const tech = app.scores?.technical || 70;
            const comm = app.scores?.communication || 70;

            return (
              <div
                key={app.id}
                className="rounded-3xl border border-white/60 bg-white/50 p-6 shadow-xl shadow-slate-200/20 backdrop-blur-md glass-panel flex flex-col justify-between hover:scale-[1.01] hover:shadow-2xl transition-all duration-300 group"
              >
                <div>
                  {/* Header info */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <Image
                        src={app.candidateAvatar}
                        alt={app.candidateName}
                        width={42}
                        height={42}
                        className="h-11 w-11 rounded-full border border-purple-100 object-cover shadow-sm"
                        unoptimized
                      />
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-xs">{app.candidateName}</h3>
                        <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">{app.candidateEmail}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 uppercase">
                        {composite}% composite
                      </span>
                      {app.biasReport && (
                        <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-emerald-600 bg-emerald-50/50 px-1.5 py-0.2 rounded border border-emerald-100 uppercase mt-0.5">
                          Bias Passed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Skills tags */}
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {app.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-[9px] font-bold px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-600"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Summary reasoning */}
                  {app.reasoning && (
                    <p className="mt-4 text-[11px] text-slate-500 font-semibold leading-relaxed line-clamp-2 italic">
                      &ldquo;{app.reasoning}&rdquo;
                    </p>
                  )}
                </div>

                {/* Lower Action bar */}
                <div className="mt-6 flex justify-between items-center border-t border-slate-100 pt-4">
                  <div className="flex gap-4 text-[9px] font-bold text-slate-450 uppercase">
                    <span>Tech: <strong className="text-slate-700">{tech}%</strong></span>
                    <span>Comm: <strong className="text-slate-700">{comm}%</strong></span>
                  </div>
                  <Link
                    href={`/hr/candidates/${app.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-purple-650 hover:text-purple-700 transition-all group-hover:translate-x-0.5"
                  >
                    Inspect Profile
                    <ChevronRight className="h-4 w-4 text-purple-400" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 rounded-3xl border border-dashed border-slate-300 bg-white/20 glass-panel">
          <Users className="h-10 w-10 text-slate-350 mx-auto mb-3" />
          <h3 className="text-lg font-black text-slate-700">No matching candidates found</h3>
          <p className="text-xs text-slate-500 font-semibold mt-1">Try relaxing filters or widening search criteria.</p>
        </div>
      )}
    </div>
  );
}
