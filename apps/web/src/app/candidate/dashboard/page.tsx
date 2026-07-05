'use client';

import React from 'react';
import Link from 'next/link';
import { mockApplications, mockJobs } from '@/lib/mockData';
import { Briefcase, Calendar, ArrowRight, Mic, Award } from 'lucide-react';

export default function CandidateDashboard() {
  // Ananya Iyer applications:
  const janeApps = mockApplications.filter((app) => app.candidateEmail === 'ananya.iyer@gmail.com');

  const scheduledInterviews = janeApps.filter((app) => app.status === 'interview_scheduled');

  // Recommendations: jobs that are not Swiggy (where Ananya already applied)
  const recommendations = mockJobs.filter((job) => job.orgId !== 'org-swiggy').slice(0, 2);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/45 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome back, Ananya</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Track your applications, read interview transcripts, and practice mock interviews.
          </p>
        </div>
        <Link
          href="/candidate/mock/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 hover:scale-[1.02] transition-all cursor-pointer"
        >
          <Mic className="h-4 w-4" />
          Start Practice Mock
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card glass-card-indigo p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-xl font-extrabold text-slate-800">{janeApps.length}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Total Applications</span>
          </div>
        </div>

        <div className="glass-card glass-card-emerald p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-xl font-extrabold text-slate-800">{scheduledInterviews.length}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Scheduled Interviews</span>
          </div>
        </div>

        <div className="glass-card glass-card-purple p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-xl font-extrabold text-slate-800">85%</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Latest Mock Score</span>
          </div>
        </div>
      </div>

      {/* Application Statuses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Applications */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-extrabold text-slate-800">Active Applications</h2>
            <Link
              href="/candidate/applications"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-0.5"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-4">
            {janeApps.map((app) => (
              <div
                key={app.id}
                className="glass-card p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div>
                  <h3 className="text-xs font-bold text-slate-800">{app.jobTitle}</h3>
                  <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">{app.orgName}</span>
                  <span className="text-[10px] text-slate-400 block mt-2">Applied on {app.appliedDate}</span>
                </div>
                <div className="flex flex-col sm:items-end gap-2.5 w-full sm:w-auto">
                  <span className={`self-start sm:self-auto text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${app.status === 'decided'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : app.status === 'interview_scheduled'
                        ? 'bg-purple-50 text-purple-700 border-purple-100'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                    }`}>
                    {app.status.replace('_', ' ')}
                  </span>
                  <Link
                    href={`/candidate/applications/${app.id}`}
                    className="text-center text-xs font-bold text-slate-700 hover:text-indigo-600 border border-slate-200 bg-white/40 px-3 py-1.5 rounded-full shadow-sm glass-panel"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Jobs */}
        <div className="space-y-4">
          <h2 className="text-base font-extrabold text-slate-800">Jobs for You</h2>
          <div className="space-y-4">
            {recommendations.map((job) => (
              <div
                key={job.id}
                className="glass-card glass-card-indigo p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-white/50 text-slate-800 font-extrabold text-lg shadow-sm overflow-hidden p-1 flex-shrink-0">
                      {job.orgLogo.startsWith('http') || job.orgLogo.startsWith('/') ? (
                        <img src={job.orgLogo} alt={job.orgName} className="h-full w-full object-contain" />
                      ) : (
                        job.orgLogo
                      )}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{job.title}</h4>
                      <span className="text-[10px] font-bold text-indigo-600">{job.orgName}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/45 pt-3">
                  <span className="text-[10px] text-slate-400 font-semibold">{job.location}</span>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                  >
                    Details
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
