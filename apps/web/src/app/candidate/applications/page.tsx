'use client';

import React from 'react';
import Link from 'next/link';
import { mockApplications } from '@/lib/mockData';
import { Compass, Briefcase, ChevronRight } from 'lucide-react';

export default function CandidateApplications() {
  const janeApps = mockApplications.filter((app) => app.candidateEmail === 'ananya.iyer@gmail.com');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-sans">My Applications</h1>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Review screening and interview stages for all positions you applied to across the platform.
        </p>
      </div>

      {janeApps.length > 0 ? (
        <div className="rounded-3xl border border-white/60 bg-white/45 shadow-md backdrop-blur-md glass-panel overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-white/30 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Position</th>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date Applied</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {janeApps.map((app) => (
                <tr key={app.id} className="hover:bg-white/20 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{app.jobTitle}</td>
                  <td className="px-6 py-4 text-indigo-600">{app.orgName}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                      app.status === 'decided'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : app.status === 'interview_scheduled'
                        ? 'bg-purple-50 text-purple-700 border-purple-100'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                    }`}>
                      {app.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{app.appliedDate}</td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/candidate/applications/${app.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      Track Application
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 rounded-3xl border border-dashed border-slate-300 bg-white/20 glass-panel">
          <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No applications yet</h3>
          <p className="text-xs text-slate-500 mt-1 mb-6">Explore the open roles board to start applying.</p>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-all cursor-pointer"
          >
            <Compass className="h-4 w-4" />
            Browse Jobs
          </Link>
        </div>
      )}
    </div>
  );
}
