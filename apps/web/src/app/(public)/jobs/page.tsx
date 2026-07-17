'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import { mockJobs, mockApplications } from '@/lib/mockData';
import { Search, MapPin, DollarSign, Briefcase, Filter } from 'lucide-react';

export default function JobsPage() {
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedExperience, setSelectedExperience] = useState('All');

  // Filter jobs based on criteria
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
    <div className="flex flex-col min-h-screen">
      <PublicNavbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        {/* Header */}
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Open Opportunities</h1>
          <p className="mt-2 text-sm text-slate-600">
            Apply to top-tier startups and organizations with a single unified NextRound candidate profile.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-2xl border border-white/60 bg-white/40 shadow-md backdrop-blur-md glass-panel">
          {/* Search box */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search roles, keywords, or companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200/80 bg-white/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Location filter */}
          <div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200/80 bg-white/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            >
              <option value="All">All Locations</option>
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
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200/80 bg-white/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            >
              <option value="All">All Levels</option>
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
              const hasApplied = mockApplications.some((a) => a.jobId === job.id);
              const matchPercent = job.id === 'job-101' ? 98 : job.id === 'job-102' ? 89 : 74;

              return (
                <div
                  key={job.id}
                  className="rounded-2xl border border-white/60 bg-white/40 p-6 shadow-sm hover:shadow-md transition-all glass-panel glass-panel-hover flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-slate-200/60 text-slate-800 font-extrabold text-lg shadow-sm overflow-hidden p-1 flex-shrink-0">
                          {job.orgLogo.startsWith('http') || job.orgLogo.startsWith('/') ? (
                            <img src={job.orgLogo} alt={job.orgName} className="h-full w-full object-contain" />
                          ) : (
                            job.orgLogo
                          )}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800 text-base">{job.title}</h3>
                            {hasApplied && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-150 uppercase">
                                Applied
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1.5">
                            {job.orgName}
                            <span className="h-1 w-1 rounded-full bg-slate-350"></span>
                            <span className="text-[10px] text-emerald-600 font-bold">{matchPercent}% Match</span>
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        job.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {job.status}
                      </span>
                    </div>

                  <p className="mt-4 text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {job.description}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-150 pt-4">
                    <div className="flex items-center gap-1 text-slate-500 text-xs font-medium">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 text-xs font-medium">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>{job.salary}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 text-xs font-medium">
                      <Briefcase className="h-3.5 w-3.5" />
                      <span>{job.experienceLevel}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between pt-2">
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Posted on {job.postedDate}
                  </span>
                  <div className="flex gap-2">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors border border-slate-200 bg-white/40 px-4 py-2 rounded-full glass-panel"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/signup?role=candidate&jobId=${job.id}`}
                      className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-full shadow-sm hover:shadow transition-all"
                    >
                      Apply Now
                    </Link>
                  </div>
                </div>
              </div>
            )})}
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 bg-white/20 glass-panel">
            <Filter className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700">No jobs match your criteria</h3>
            <p className="text-xs text-slate-500 mt-1">Try widening your search terms or adjusting filters.</p>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
