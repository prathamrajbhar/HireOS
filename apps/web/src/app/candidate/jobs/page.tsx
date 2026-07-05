'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { mockJobs, mockApplications } from '@/lib/mockData';
import { Search, MapPin, DollarSign, Briefcase, Filter } from 'lucide-react';

export default function CandidateJobsPage() {
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedExperience, setSelectedExperience] = useState('All');

  // Filter jobs based on search criteria
  const filteredJobs = mockJobs.filter((job) => {
    const matchesSearch = job.title.toLowerCase().includes(search.toLowerCase()) || 
                          job.orgName.toLowerCase().includes(search.toLowerCase()) ||
                          job.description.toLowerCase().includes(search.toLowerCase());
    
    const matchesLocation = selectedLocation === 'All' || 
                            (selectedLocation === 'Remote' && job.location.toLowerCase().includes('remote')) ||
                            (selectedLocation === 'Hybrid' && job.location.toLowerCase().includes('hybrid')) ||
                            (selectedLocation === 'Onsite' && !job.location.toLowerCase().includes('remote') && !job.location.toLowerCase().includes('hybrid'));

    const matchesExperience = selectedExperience === 'All' || 
                              (selectedExperience === 'Senior' && job.experienceLevel.toLowerCase().includes('senior')) ||
                              (selectedExperience === 'Mid' && !job.experienceLevel.toLowerCase().includes('senior') && !job.experienceLevel.toLowerCase().includes('lead')) ||
                              (selectedExperience === 'Lead' && job.experienceLevel.toLowerCase().includes('lead'));

    return matchesSearch && matchesLocation && matchesExperience;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Browse Opportunities</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Apply to open roles directly from your dashboard.
          </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-2xl border border-white/60 bg-white/40 shadow-md backdrop-blur-md glass-panel">
        {/* Search box */}
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search roles, keywords, or companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200/80 bg-white/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all glass-input"
          />
        </div>

        {/* Location filter */}
        <div>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 bg-white/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all glass-input font-semibold text-slate-600"
          >
            <option value="All">Locations</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Onsite">On-Site</option>
          </select>
        </div>

        {/* Experience level */}
        <div>
          <select
            value={selectedExperience}
            onChange={(e) => setSelectedExperience(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 bg-white/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all glass-input font-semibold text-slate-600"
          >
            <option value="All">Experience</option>
            <option value="Mid">Mid-Level</option>
            <option value="Senior">Senior Level</option>
            <option value="Lead">Lead Level</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Job Cards */}
      {filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredJobs.map((job) => {
            const hasApplied = mockApplications.some((a) => a.jobId === job.id && a.candidateEmail === 'ananya.iyer@gmail.com');
            const matchPercent = job.id === 'job-101' ? 98 : job.id === 'job-102' ? 89 : 74;

            return (
              <div
                key={job.id}
                className="rounded-2xl border border-white/60 bg-white/40 p-5 shadow-sm hover:shadow-md transition-all glass-panel glass-panel-hover flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-slate-200/60 text-slate-800 font-extrabold text-base shadow-sm overflow-hidden p-1 flex-shrink-0">
                        {job.orgLogo.startsWith('http') || job.orgLogo.startsWith('/') ? (
                          <img src={job.orgLogo} alt={job.orgName} className="h-full w-full object-contain" />
                        ) : (
                          job.orgLogo
                        )}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-800 text-sm">{job.title}</h3>
                          {hasApplied && (
                            <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-150 uppercase">
                              Applied
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-indigo-650 flex items-center gap-1.5">
                          {job.orgName}
                          <span className="h-1 w-1 rounded-full bg-slate-350"></span>
                          <span className="text-[10px] text-emerald-600 font-bold">{matchPercent}% Score</span>
                        </span>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      job.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {job.status}
                    </span>
                  </div>

                  <p className="mt-4 text-xs text-slate-600 line-clamp-3 leading-relaxed font-medium">
                    {job.description}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100/50 pt-4">
                    <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold">
                      <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                      <span>{job.salary}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold">
                      <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                      <span>{job.experienceLevel}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between pt-2">
                  <span className="text-[9px] text-slate-400 font-bold">
                    Posted on {job.postedDate}
                  </span>
                  <div className="flex gap-2">
                    <Link
                      href={`/candidate/jobs/${job.id}`}
                      className="text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors border border-slate-200 bg-white/40 px-4 py-2 rounded-full glass-panel"
                    >
                      View details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-350 bg-white/20 glass-panel">
          <Filter className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No jobs match your criteria</h3>
          <p className="text-xs text-slate-500 mt-1">Try widening your search terms or adjusting filters.</p>
        </div>
      )}
    </div>
  );
}
