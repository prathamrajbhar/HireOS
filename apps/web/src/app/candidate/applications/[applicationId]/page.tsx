'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { mockApplications } from '@/lib/mockData';
import { ChevronRight, Calendar, Video, FileText, CheckCircle2, ArrowRight } from 'lucide-react';

export default function CandidateApplicationDetailPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = use(params);
  
  const app = mockApplications.find((a) => a.id === applicationId) || mockApplications[0];

  const stages = [
    { name: 'Applied', desc: 'Application received and resume queue matching active.', done: true },
    { name: 'Screened', desc: 'AI Screening Agent completed parsing and qualification matching.', done: app.status !== 'screening' },
    { name: 'Interview', desc: 'Completed voice conversational session with Interviewer Agent.', done: app.status === 'interviewed' || app.status === 'decided' },
    { name: 'Decision', desc: 'Final structured scoring compiled. Outcome determined.', done: app.status === 'decided' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <Link href="/candidate/applications" className="hover:text-indigo-600 transition-colors">Applications</Link>
        <ChevronRight className="h-3 w-3 text-slate-300" />
        <span className="text-slate-800">{app.jobTitle}</span>
      </div>

      {/* Overview Card */}
      <div className="rounded-3xl border border-white/60 bg-white/45 p-6 shadow-md backdrop-blur-md glass-panel flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Application Status</span>
          <h1 className="text-xl font-extrabold text-slate-900 mt-1">{app.jobTitle}</h1>
          <span className="text-xs font-semibold text-indigo-600 mt-0.5 block">{app.orgName}</span>
        </div>
        <span className={`text-[10px] font-bold px-3 py-1 rounded-full border uppercase ${
          app.status === 'decided'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
            : 'bg-indigo-50 text-indigo-700 border-indigo-100'
        }`}>
          {app.status.replace('_', ' ')}
        </span>
      </div>

      {/* Main Grid: Status Details & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Stages Timeline */}
        <div className="lg:col-span-2 rounded-3xl border border-white/60 bg-white/40 p-6 md:p-8 shadow-sm backdrop-blur-md glass-panel">
          <h2 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-3 mb-6">Stage Pipeline</h2>
          
          <div className="space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200/60">
            {stages.map((st, idx) => (
              <div key={idx} className="flex gap-4 relative">
                <div className={`h-6.5 w-6.5 rounded-full border flex items-center justify-center text-white z-10 flex-shrink-0 ${
                  st.done 
                    ? 'bg-emerald-500 border-emerald-600' 
                    : 'bg-slate-100 border-slate-200 text-slate-400'
                }`}>
                  {st.done ? (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  ) : (
                    <span className="text-[10px] font-bold">{idx + 1}</span>
                  )}
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${st.done ? 'text-slate-800' : 'text-slate-400'}`}>{st.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium leading-relaxed">{st.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Panel Column */}
        <div className="space-y-6">
          {/* Action trigger based on application status */}
          {app.status === 'interview_scheduled' && (
            <div className="rounded-3xl border border-purple-100 bg-purple-50/40 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
              <div className="flex items-center gap-2 text-purple-700">
                <Calendar className="h-5 w-5" />
                <span className="text-sm font-bold">Interview Scheduled</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Your AI Voice Interview is confirmed for <span className="text-slate-800 font-bold">{app.confirmedSlot}</span>.
              </p>
              <Link
                href={`/interview/${app.id}`}
                className="w-full flex items-center justify-center gap-1.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 text-xs shadow-sm transition-all cursor-pointer"
              >
                <Video className="h-4 w-4" />
                Join Live Interview Room
              </Link>
            </div>
          )}

          {app.status === 'screening' && (
            <div className="rounded-3xl border border-indigo-100 bg-indigo-50/40 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
              <div className="flex items-center gap-2 text-indigo-700">
                <FileText className="h-5 w-5 animate-pulse" />
                <span className="text-sm font-bold">Screening Pending</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Our Screening Agent is compiling resume qualification matches. Check back shortly for slots.
              </p>
            </div>
          )}

          {app.status === 'decided' && (
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 font-extrabold">
                <CheckCircle2 className="h-5 w-5" />
                <span>Offer Released!</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Congratulations! The Decision Agent has completed evaluation. Here is your feedback summary:
              </p>
              <div className="bg-white/60 p-3.5 rounded-2xl border border-slate-100 text-[11px] text-slate-600 italic font-semibold">
                &ldquo;Jane showcased expert layouts design and responsive styling logic. She exceeds qualification requirements.&rdquo;
              </div>
            </div>
          )}

          {/* Practice Promotion */}
          <div className="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-md glass-panel space-y-3">
            <h3 className="text-xs font-bold text-slate-800">Practice Before Your Interview</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
              Prepare using the same voice conversational agents. Run a practice simulation for {app.orgName}.
            </p>
            <Link
              href={`/candidate/mock/new?company=${app.orgName}&role=${app.jobTitle}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
            >
              Start Practice Session
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
