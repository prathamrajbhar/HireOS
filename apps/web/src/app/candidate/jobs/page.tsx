'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { mockJobs, mockApplications } from '@/lib/mockData';
import { Search, MapPin, DollarSign, Briefcase, Filter } from '@/lib/lucide-google-icons';

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
      <div className="border-b border-slate-200/60 dark:border-slate-800 pb-4">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Browse Opportunities</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
            Apply to open roles directly from your dashboard.
          </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-2xl border border-white/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/60 shadow-md backdrop-blur-md glass-panel">
        {/* Search box */}
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search roles, keywords, or companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white/50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition-all glass-input"
          />
        </div>

        {/* Location filter */}
        <div>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white/50 dark:bg-slate-800/60 focus:outline-none focus:border-brand-500 transition-all glass-input font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="All" className="dark:bg-slate-900 dark:text-slate-200">Locations</option>
            <option value="Remote" className="dark:bg-slate-900 dark:text-slate-200">Remote</option>
            <option value="Hybrid" className="dark:bg-slate-900 dark:text-slate-200">Hybrid</option>
            <option value="Onsite" className="dark:bg-slate-900 dark:text-slate-200">On-Site</option>
          </select>
        </div>

        {/* Experience level */}
        <div>
          <select
            value={selectedExperience}
            onChange={(e) => setSelectedExperience(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white/50 dark:bg-slate-800/60 focus:outline-none focus:border-brand-500 transition-all glass-input font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="All" className="dark:bg-slate-900 dark:text-slate-200">Experience</option>
            <option value="Mid" className="dark:bg-slate-900 dark:text-slate-200">Mid-Level</option>
            <option value="Senior" className="dark:bg-slate-900 dark:text-slate-200">Senior Level</option>
            <option value="Lead" className="dark:bg-slate-900 dark:text-slate-200">Lead Level</option>
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
                className="rounded-2xl border border-white/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/60 p-5 shadow-sm hover:shadow-md transition-all glass-panel glass-panel-hover flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-extrabold text-base shadow-sm overflow-hidden p-1 flex-shrink-0">
                        {job.orgLogo.startsWith('http') || job.orgLogo.startsWith('/') ? (
                          <img src={job.orgLogo} alt={job.orgName} className="h-full w-full object-contain" />
                        ) : (
                          job.orgLogo
                        )}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{job.title}</h3>
                          {hasApplied && (
                            <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-brand-50 dark:bg-orange-950/60 text-brand-700 dark:text-orange-300 border border-brand-150 dark:border-orange-900/60 uppercase">
                              Applied
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-brand-600 dark:text-orange-400 flex items-center gap-1.5">
                          {job.orgName}
                          <span className="h-1 w-1 rounded-full bg-slate-350 dark:bg-slate-600"></span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{matchPercent}% Score</span>
                        </span>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      job.status === 'active' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/60' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}>
                      {job.status}
                    </span>
                  </div>

                  <p className="mt-4 text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed font-medium">
                    {job.description}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-200/50 dark:border-slate-800 pt-4">
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                      <DollarSign className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      <span>{job.salary}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                      <Briefcase className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      <span>{job.experienceLevel}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between pt-2">
                  <span className="text-[9px] text-slate-400 dark:text-slate-400 font-bold">
                    Posted on {job.postedDate}
                  </span>
                  <div className="flex gap-2">
                    <Link
                      href={`/candidate/jobs/${job.id}`}
                      className="text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-orange-400 transition-colors border border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-800/40 px-4 py-2 rounded-full glass-panel"
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
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/20 dark:bg-slate-900/40 glass-panel">
          <Filter className="h-10 w-10 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">No jobs match your criteria</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try widening your search terms or adjusting filters.</p>
        </div>
      )}
    </div>
  );
}
