'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { mockJobs, mockApplications } from '@/lib/mockData';
import { MapPin, DollarSign, Briefcase, Calendar, Award, ChevronRight, Check, Sparkles, Mic, Code } from 'lucide-react';

export default function CandidateJobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  
  const job = mockJobs.find((j) => j.id === jobId) || mockJobs[0];
  const initialApplied = mockApplications.some((a) => a.jobId === job.id && a.candidateEmail === 'ananya.iyer@gmail.com');
  
  const [applied, setApplied] = useState(initialApplied);

  // Simulating similar jobs
  const similarJobs = mockJobs.filter((j) => j.id !== job.id).slice(0, 2);

  const handleApply = () => {
    setApplied(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <Link href="/candidate/jobs" className="hover:text-indigo-600 transition-colors">Browse Jobs</Link>
        <ChevronRight className="h-3 w-3 text-slate-300" />
        <span className="text-slate-800 line-clamp-1">{job.title}</span>
      </div>

      {/* Job Header Card */}
      <div className="rounded-3xl border border-white/60 bg-white/45 p-6 shadow-md backdrop-blur-md glass-panel flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-slate-200/60 text-slate-800 font-extrabold text-xl shadow-sm overflow-hidden p-1 flex-shrink-0">
            {job.orgLogo.startsWith('http') || job.orgLogo.startsWith('/') ? (
              <img src={job.orgLogo} alt={job.orgName} className="h-full w-full object-contain" />
            ) : (
              job.orgLogo
            )}
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{job.title}</h1>
            <span className="text-xs font-bold text-indigo-655">{job.orgName}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {applied ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-4 py-2 shadow-sm animate-in scale-in duration-200">
              <Check className="h-4 w-4" />
              Applied Successfully
            </span>
          ) : (
            <button
              onClick={handleApply}
              className="w-full md:w-auto text-center rounded-full bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-md transition-all cursor-pointer"
            >
              Apply to this Role
            </button>
          )}
        </div>
      </div>

      {/* Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Job Description */}
          <div className="rounded-3xl border border-white/60 bg-white/40 p-6 md:p-8 shadow-sm backdrop-blur-md glass-panel">
            <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">About the Role</h2>
            <p className="mt-4 text-xs text-slate-600 leading-relaxed font-semibold">
              {job.description}
            </p>
            <h3 className="text-xs font-extrabold text-slate-850 mt-6 mb-2">Core Responsibilities</h3>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1.5 font-medium">
              <li>Design, deploy, and benchmark core features and architectural specifications.</li>
              <li>Write production-grade, maintainable code with strict TypeScript compilers.</li>
              <li>Collaborate with UI designers to build high-performance dashboard layouts.</li>
              <li>Integrate robust error boundaries and logging middleware interfaces.</li>
            </ul>
          </div>

          {/* Rubric: What We Look For */}
          <div className="rounded-3xl border border-white/60 bg-white/40 p-6 md:p-8 shadow-sm backdrop-blur-md glass-panel">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Award className="h-5 w-5 text-indigo-500" />
              <h2 className="text-base font-bold text-slate-800">What we look for</h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Our Evaluation Agent evaluates candidate qualifications along 4 core dimensions matching this rubric structure:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100/50">
                <span className="text-[10px] font-bold text-indigo-500 uppercase">Technical Knowledge</span>
                <span className="block text-lg font-extrabold text-slate-800 mt-1">{job.rubric.technical}% weight</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100/50">
                <span className="text-[10px] font-bold text-purple-500 uppercase">Communication Skill</span>
                <span className="block text-lg font-extrabold text-slate-800 mt-1">{job.rubric.communication}% weight</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-pink-50/50 border border-pink-100/50">
                <span className="text-[10px] font-bold text-pink-500 uppercase">Problem Solving</span>
                <span className="block text-lg font-extrabold text-slate-800 mt-1">{job.rubric.problemSolving}% weight</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100/50">
                <span className="text-[10px] font-bold text-emerald-500 uppercase">Relevant Experience</span>
                <span className="block text-lg font-extrabold text-slate-800 mt-1">{job.rubric.experience}% weight</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Overview</h3>
            <div className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-3">
                <MapPin className="h-4.5 w-4.5 text-slate-400" />
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Location</span>
                  <span>{job.location}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="h-4.5 w-4.5 text-slate-400" />
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Yearly Salary</span>
                  <span>{job.salary}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Briefcase className="h-4.5 w-4.5 text-slate-400" />
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Experience Level</span>
                  <span>{job.experienceLevel}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4.5 w-4.5 text-slate-400" />
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Date Posted</span>
                  <span>{job.postedDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Practice & Prep Arena */}
          <div className="rounded-3xl border border-amber-100 bg-amber-50/10 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
            <div>
              <h3 className="text-sm font-black text-amber-800 flex items-center gap-1.5">
                <Sparkles className="h-4.5 w-4.5" />
                AI Practice & Prep Arena
              </h3>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-1.5">
                Prepare for the official hiring process. Try our tailored AI mock rounds.
              </p>
            </div>

            <div className="space-y-2.5">
              {/* Voice Mock Interview */}
              <div className="p-3 bg-white/50 border border-slate-200/60 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Mic className="h-4 w-4" />
                  <span className="text-xs font-bold">Voice Interview Practice</span>
                </div>
                <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">
                  Practice dynamic conversational questions matching {job.orgName}'s interview criteria.
                </p>
                <Link
                  href={`/candidate/mock/new?company=${encodeURIComponent(job.orgName)}&role=${encodeURIComponent(job.title)}`}
                  className="w-full flex items-center justify-center gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 text-[10px] transition-all cursor-pointer shadow-sm"
                >
                  Start Mock Session
                </Link>
              </div>

              {/* Assessment Practice */}
              <div className="p-3 bg-white/50 border border-slate-200/60 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-amber-700">
                  <Code className="h-4 w-4" />
                  <span className="text-xs font-bold">Coding & MCQ Practice</span>
                </div>
                <p className="text-[10px] text-slate-455 leading-relaxed font-semibold">
                  Try a mock LeetCode-style compiler test running against test case inputs.
                </p>
                <Link
                  href="/candidate/applications/app-501/assessment"
                  className="w-full flex items-center justify-center gap-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 text-[10px] transition-all cursor-pointer shadow-sm"
                >
                  Launch Practice Test
                </Link>
              </div>
            </div>
          </div>

          {/* Similar Opportunities */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-800">Similar Roles</h3>
            <div className="space-y-3">
              {similarJobs.map((simJob) => (
                <Link
                  key={simJob.id}
                  href={`/candidate/jobs/${simJob.id}`}
                  className="block rounded-2xl border border-white/60 bg-white/45 p-4 shadow-sm hover:shadow transition-all glass-panel glass-panel-hover"
                >
                  <h4 className="text-xs font-bold text-slate-850">{simJob.title}</h4>
                  <span className="text-[10px] font-bold text-indigo-600 block mt-0.5">{simJob.orgName}</span>
                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <span>{simJob.location}</span>
                    <span>{simJob.salary}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
