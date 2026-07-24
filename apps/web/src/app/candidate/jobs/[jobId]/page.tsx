'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { mockJobs, mockApplications } from '@/lib/mockData';
import { CompanyLogo } from '@/components/ui';
import {
  MapPin,
  DollarSign,
  Briefcase,
  Calendar,
  Award,
  ChevronRight,
  Check,
  Sparkles,
  Mic,
  Code,
  Building2,
  CheckCircle2,
  Share2,
  Bookmark,
  Users,
  ShieldCheck,
  Layers,
  ArrowRight,
} from '@/lib/lucide-google-icons';

// Mapping tech skills / tags per job for richer visual representation
const jobSkillsMap: Record<string, string[]> = {
  'job-101': ['React', 'TypeScript', 'Next.js', 'Micro-frontends', 'Web Vitals', 'Tailwind CSS'],
  'job-102': ['Product Strategy', 'UPI Payments', 'Checkout UX', 'Analytics', 'System Architecture'],
  'job-103': ['Node.js', 'Go', 'PostgreSQL', 'React', 'Distributed Ledgers', 'High Throughput'],
  'job-104': ['Python', 'NLP', 'PyTorch', 'Vector DBs', 'RAG Pipelines', 'Machine Learning'],
};

export default function CandidateJobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);

  const job = mockJobs.find((j) => j.id === jobId) || mockJobs[0];
  const initialApplied = mockApplications.some(
    (a) => a.jobId === job.id && a.candidateEmail === 'ananya.iyer@gmail.com'
  );

  const [applied, setApplied] = useState(initialApplied);
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);

  const similarJobs = mockJobs.filter((j) => j.id !== job.id).slice(0, 2);
  const skills = jobSkillsMap[job.id] || ['TypeScript', 'React', 'Node.js', 'System Design'];

  const router = useRouter();
  const handleApply = () => {
    setApplied(true);
    setTimeout(() => {
      router.push('/candidate/applications/app-503');
    }, 600);
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Link
            href="/candidate/jobs"
            className="hover:text-brand-600 dark:hover:text-orange-400 transition-colors flex items-center gap-1"
          >
            Browse Jobs
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
          <span className="text-slate-800 dark:text-slate-200 font-bold line-clamp-1">{job.title}</span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBookmarked(!bookmarked)}
            className={`p-2 rounded-xl border transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              bookmarked
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900/60 text-amber-600 dark:text-amber-300'
                : 'bg-white/50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Save job"
          >
            <Bookmark className={`h-4 w-4 ${bookmarked ? 'fill-amber-500' : ''}`} />
            <span className="hidden sm:inline">{bookmarked ? 'Saved' : 'Save'}</span>
          </button>

          <button
            onClick={handleShare}
            className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            title="Share opportunity"
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Hero Job Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/60 dark:border-slate-800 bg-gradient-to-br from-white/70 via-white/50 to-slate-50/50 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-slate-950/80 p-6 md:p-8 shadow-md backdrop-blur-md glass-panel">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            {/* Redesigned Company Logo Component */}
            <CompanyLogo name={job.orgName} logoUrl={job.orgLogo} size="xl" className="shadow-md flex-shrink-0" />

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-brand-600 dark:text-orange-400 flex items-center gap-1">
                  {job.orgName}
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 fill-blue-500/10" />
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60 uppercase">
                  Active Hiring
                </span>
              </div>

              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-1 font-display leading-tight">
                {job.title}
              </h1>

              {/* Header metadata chips */}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  {job.location}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  <DollarSign className="h-3.5 w-3.5" />
                  {job.salary}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  {job.experienceLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto flex-shrink-0">
            {applied ? (
              <div className="inline-flex items-center justify-center gap-2 text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/80 rounded-full px-6 py-3 shadow-sm animate-in scale-in duration-200">
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Application Submitted
              </div>
            ) : (
              <button
                onClick={handleApply}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 dark:bg-orange-600 hover:bg-brand-700 dark:hover:bg-orange-700 px-8 py-3 text-xs font-extrabold text-white shadow-md hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Apply to this Role</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tech Skills Pills */}
        <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
            <Layers className="h-3 w-3" /> Tech Stack:
          </span>
          {skills.map((skill) => (
            <span
              key={skill}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/80"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Main 2-Column Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* About the Role Section */}
          <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/60 p-6 md:p-8 shadow-sm backdrop-blur-md glass-panel space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
                <Building2 className="h-4.5 w-4.5 text-brand-500 dark:text-orange-400" />
                About the Role
              </h2>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                Posted on {job.postedDate}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal text-justify sm:text-left">
              {job.description}
            </p>

            <div className="pt-2">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-3">
                Core Responsibilities
              </h3>
              <div className="space-y-2.5">
                {[
                  'Design, deploy, and benchmark core features and architectural specifications.',
                  'Write production-grade, maintainable code with strict TypeScript compilers and unit coverage.',
                  'Collaborate with UI/UX designers to build high-performance, accessible dashboard layouts.',
                  'Integrate robust error boundaries, structured monitoring, and telemetry middleware.',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-brand-50 dark:bg-orange-950/60 border border-brand-200 dark:border-orange-900/60 flex items-center justify-center text-brand-600 dark:text-orange-400 flex-shrink-0 mt-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rubric: What We Look For Section */}
          <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/60 p-6 md:p-8 shadow-sm backdrop-blur-md glass-panel space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-display">
                  What We Look For
                </h2>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60 uppercase">
                AI Evaluation Rubric
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Our automated Evaluation Agent evaluates candidate submissions and interview transcripts across 4 weighted core dimensions:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Technical Knowledge */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-brand-600 dark:text-orange-400 uppercase tracking-wider">
                    Technical Knowledge
                  </span>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                    {job.rubric.technical}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-500 dark:bg-orange-500 transition-all duration-500"
                    style={{ width: `${job.rubric.technical}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Syntax proficiency, algorithm efficiency, and architecture design.
                </p>
              </div>

              {/* Communication Skill */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                    Communication Skill
                  </span>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                    {job.rubric.communication}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500 dark:bg-purple-400 transition-all duration-500"
                    style={{ width: `${job.rubric.communication}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Clarity of thought, active listening, and structured explanation.
                </p>
              </div>

              {/* Problem Solving */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider">
                    Problem Solving
                  </span>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                    {job.rubric.problemSolving}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-pink-500 dark:bg-pink-400 transition-all duration-500"
                    style={{ width: `${job.rubric.problemSolving}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Deconstruction of ambiguous edge cases and solution trade-offs.
                </p>
              </div>

              {/* Relevant Experience */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Relevant Experience
                  </span>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                    {job.rubric.experience}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-500"
                    style={{ width: `${job.rubric.experience}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Domain depth, past production deployments, and leadership background.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Overview Card */}
          <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/60 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 border-b border-slate-200/60 dark:border-slate-800 pb-3 font-display">
              Overview
            </h3>
            <div className="space-y-3.5 text-xs font-semibold">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40">
                <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">
                    Location
                  </span>
                  <span className="text-slate-800 dark:text-slate-200">{job.location}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">
                    Yearly Salary
                  </span>
                  <span className="text-slate-800 dark:text-slate-200">{job.salary}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40">
                <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-900/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">
                    Experience Level
                  </span>
                  <span className="text-slate-800 dark:text-slate-200">{job.experienceLevel}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40">
                <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">
                    Date Posted
                  </span>
                  <span className="text-slate-800 dark:text-slate-200">{job.postedDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Practice & Prep Arena Card */}
          <div className="rounded-3xl border border-amber-200 dark:border-amber-900/60 bg-gradient-to-b from-amber-50/40 to-amber-100/20 dark:from-amber-950/30 dark:to-amber-900/10 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
                AI Practice & Prep Arena
              </h3>
              <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed mt-1.5">
                Prepare for official rounds using interactive AI mock evaluations matching {job.orgName}'s rubric.
              </p>
            </div>

            <div className="space-y-3">
              {/* Voice Mock Interview */}
              <div className="p-3.5 bg-white/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 rounded-2xl space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 text-brand-600 dark:text-orange-400">
                  <Mic className="h-4 w-4" />
                  <span className="text-xs font-bold">Voice Interview Practice</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Practice dynamic conversational questions scored by our AI Agent.
                </p>
                <Link
                  href={`/candidate/mock/new?company=${encodeURIComponent(job.orgName)}&role=${encodeURIComponent(job.title)}&track=technical`}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 dark:bg-orange-600 hover:bg-brand-700 dark:hover:bg-orange-700 text-white font-bold py-2 text-xs transition-all cursor-pointer shadow-xs"
                >
                  <span>Start Mock Session</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Coding & MCQ Practice */}
              <div className="p-3.5 bg-white/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 rounded-2xl space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Code className="h-4 w-4" />
                  <span className="text-xs font-bold">Coding &amp; MCQ Practice</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Try a simulated online assessment environment with real-time feedback.
                </p>
                <Link
                  href={`/candidate/mock/new?company=${encodeURIComponent(job.orgName)}&role=${encodeURIComponent(job.title)}&track=coding`}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 dark:bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-700 text-white font-bold py-2 text-xs transition-all cursor-pointer shadow-xs"
                >
                  <span>Launch Practice Test</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Similar Roles */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Similar Opportunities
            </h3>
            <div className="space-y-3">
              {similarJobs.map((simJob) => (
                <Link
                  key={simJob.id}
                  href={`/candidate/jobs/${simJob.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/60 dark:border-slate-800 bg-white/45 dark:bg-slate-900/60 p-3.5 shadow-sm hover:shadow transition-all glass-panel glass-panel-hover"
                >
                  <CompanyLogo name={simJob.orgName} logoUrl={simJob.orgLogo} size="sm" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100 truncate">{simJob.title}</h4>
                    <span className="text-[10px] font-bold text-brand-600 dark:text-orange-400 block">{simJob.orgName}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
