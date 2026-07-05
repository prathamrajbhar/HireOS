'use client';

import React, { use } from 'react';
import Link from 'next/link';
import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import { mockJobs } from '@/lib/mockData';
import { MapPin, DollarSign, Briefcase, Calendar, ShieldAlert, Award, ChevronRight } from 'lucide-react';

export default function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  
  const job = mockJobs.find((j) => j.id === jobId) || mockJobs[0];

  // Simulating similar jobs
  const similarJobs = mockJobs.filter((j) => j.id !== job.id).slice(0, 2);

  return (
    <div className="flex flex-col min-h-screen">
      <PublicNavbar />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full animate-in fade-in duration-200">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Link href="/jobs" className="hover:text-indigo-600 transition-colors">Jobs</Link>
          <ChevronRight className="h-3 w-3 text-slate-300" />
          <span className="text-slate-800 line-clamp-1">{job.title}</span>
        </div>

        {/* Job Header Card */}
        <div className="mb-8 rounded-3xl border border-white/60 bg-white/45 p-6 md:p-8 shadow-md backdrop-blur-md glass-panel flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-slate-200/60 text-slate-800 font-extrabold text-2xl shadow-sm overflow-hidden p-1 flex-shrink-0">
              {job.orgLogo.startsWith('http') || job.orgLogo.startsWith('/') ? (
                <img src={job.orgLogo} alt={job.orgName} className="h-full w-full object-contain" />
              ) : (
                job.orgLogo
              )}
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{job.title}</h1>
              <span className="text-sm font-semibold text-indigo-600">{job.orgName}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Link
              href={`/signup?role=candidate&jobId=${job.id}`}
              className="flex-1 md:flex-initial text-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-100 hover:shadow-lg transition-all"
            >
              Apply to this Role
            </Link>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Job Description */}
            <div className="rounded-3xl border border-white/60 bg-white/40 p-6 md:p-8 shadow-sm backdrop-blur-md glass-panel">
              <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">About the Role</h2>
              <p className="mt-4 text-xs text-slate-600 leading-relaxed font-medium">
                {job.description}
              </p>
              <h3 className="text-sm font-bold text-slate-800 mt-6 mb-2">Core Responsibilities</h3>
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
                <h2 className="text-lg font-bold text-slate-800">What we look for</h2>
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
            {/* Metadata Card */}
            <div className="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Role Blueprint</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-600">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-600">
                  <DollarSign className="h-4 w-4 text-slate-400" />
                  <span>{job.salary}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-600">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  <span>{job.experienceLevel}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-600">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>Posted on {job.postedDate}</span>
                </div>
              </div>
            </div>

            {/* Org Profile Card */}
            <div className="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-md glass-panel">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">The Company</h3>
              <p className="mt-3 text-xs text-slate-500 leading-relaxed font-semibold">
                {job.orgName} is an industry-leading organization cooperating with HireOS to run zero-bias AI vetting.
              </p>
              <Link
                href="/about"
                className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Learn about AI recruitment bias checks
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {/* AI Warning Box */}
            <div className="rounded-3xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm glass-panel flex gap-2.5">
              <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">AI Screening Active</span>
                <span className="text-[10px] text-slate-500 leading-relaxed block mt-0.5">
                  Applications will trigger the Screening and live Interviewer Agents. Confirm your device microphone is functioning before starting.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Jobs */}
        {similarJobs.length > 0 && (
          <div className="border-t border-slate-200 pt-10">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Similar Roles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {similarJobs.map((sj) => (
                <Link
                  key={sj.id}
                  href={`/jobs/${sj.id}`}
                  className="rounded-2xl border border-white/60 bg-white/40 p-5 shadow-sm hover:shadow-md transition-all glass-panel glass-panel-hover flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-slate-200/60 text-slate-800 font-extrabold text-sm shadow-sm overflow-hidden p-1 flex-shrink-0">
                      {sj.orgLogo.startsWith('http') || sj.orgLogo.startsWith('/') ? (
                        <img src={sj.orgLogo} alt={sj.orgName} className="h-full w-full object-contain" />
                      ) : (
                        sj.orgLogo
                      )}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">{sj.title}</h4>
                      <span className="text-[10px] font-bold text-indigo-600">{sj.orgName}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">{sj.location}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
