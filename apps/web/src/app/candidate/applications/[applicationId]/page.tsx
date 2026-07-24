'use client';

import React, { use } from 'react';
import Link from 'next/link';
import {
  mockApplications,
  mockOffers,
  mockAssessments,
  mockAsyncScreenings,
  mockTakeHomeProjects,
  mockOnboarding,
  mockJobs,
} from '@/lib/mockData';
import { CompanyLogo } from '@/components/ui';
import {
  ChevronRight,
  Calendar,
  Video,
  FileText,
  CheckCircle2,
  ArrowRight,
  Gift,
  ClipboardCheck,
  Camera,
  Code,
  UserPlus,
  Check,
  Building2,
  Award,
  Sparkles,
  ShieldCheck,
  Clock,
  Briefcase,
  Layers,
} from '@/lib/lucide-google-icons';

export default function CandidateApplicationDetailPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = use(params);

  const app = mockApplications.find((a) => a.id === applicationId) || mockApplications[0];
  const job = mockJobs.find((j) => j.id === app.jobId) || mockJobs[0];

  const offer = mockOffers.find((o) => o.applicationId === app.id);
  const assessments = mockAssessments.filter((a) => a.applicationId === app.id);
  const asyncScreening = mockAsyncScreenings.find((s) => s.applicationId === app.id);
  const takeHome = mockTakeHomeProjects.find((t) => t.applicationId === app.id);
  const onboarding = mockOnboarding.find((o) => o.applicationId === app.id);

  const nextSteps = [
    offer && {
      icon: Gift,
      label: 'Review Your Offer',
      desc: `${offer.status === 'accepted' ? 'Accepted' : 'Action needed'} — ${offer.baseSalary} base salary`,
      href: `/candidate/applications/${app.id}/offer`,
      tone: 'emerald' as const,
      badge: offer.status === 'accepted' ? 'Completed' : 'Action Required',
    },
    assessments.length > 0 && {
      icon: ClipboardCheck,
      label: 'Aptitude Assessment',
      desc:
        assessments[0].status === 'completed'
          ? `Completed — Score: ${assessments[0].overallScore || 91}%`
          : 'Continue your timed assessment',
      href: `/candidate/mock/session-${app.id}?applicationId=${app.id}&track=aptitude`,
      tone: 'indigo' as const,
      badge: assessments[0].status === 'completed' ? 'Completed' : 'Pending',
    },
    asyncScreening && {
      icon: Camera,
      label: 'Video Screening',
      desc:
        asyncScreening.status === 'invited'
          ? 'Record your video responses'
          : 'View your submitted video responses',
      href: `/candidate/applications/${app.id}/video-screening`,
      tone: 'purple' as const,
      badge: asyncScreening.status === 'submitted' || asyncScreening.status === 'reviewed' ? 'Completed' : 'Invited',
    },
    takeHome && {
      icon: Code,
      label: 'Take-Home Project',
      desc:
        takeHome.status === 'graded'
          ? `Graded — Score: ${takeHome.overallScore || 88}%`
          : 'Continue your project submission',
      href: `/candidate/applications/${app.id}/take-home`,
      tone: 'amber' as const,
      badge: takeHome.status === 'graded' ? 'Graded' : 'In Progress',
    },
    onboarding && {
      icon: UserPlus,
      label: 'Onboarding Checklist',
      desc: `${onboarding.progressPercent}% complete — starts ${onboarding.startDate}`,
      href: `/candidate/applications/${app.id}/onboarding`,
      tone: 'emerald' as const,
      badge: `${onboarding.progressPercent}%`,
    },
  ].filter(Boolean) as {
    icon: typeof Gift;
    label: string;
    desc: string;
    href: string;
    tone: 'emerald' | 'indigo' | 'purple' | 'amber';
    badge: string;
  }[];

  const toneClass: Record<string, string> = {
    emerald:
      'border-emerald-200/80 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 hover:border-emerald-400 dark:hover:border-emerald-600',
    indigo:
      'border-indigo-200/80 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 hover:border-indigo-400 dark:hover:border-indigo-600',
    purple:
      'border-purple-200/80 dark:border-purple-800/80 bg-purple-50/50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-100 hover:border-purple-400 dark:hover:border-purple-600',
    amber:
      'border-amber-200/80 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 hover:border-amber-400 dark:hover:border-amber-600',
  };

  const badgeToneClass: Record<string, string> = {
    emerald: 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200',
    purple: 'bg-purple-100 dark:bg-purple-900/80 text-purple-800 dark:text-purple-200',
    amber: 'bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200',
  };

  const stages = [
    { name: 'Applied', desc: 'Application received and resume queue matching active.', date: app.appliedDate, done: true },
    { name: 'Screened', desc: 'AI Screening Agent completed parsing and qualification matching.', date: '2026-06-30', done: app.status !== 'screening' },
    { name: 'Assessment', desc: 'Completed Aptitude Test & Coding Assessment module.', date: '2026-07-01', done: app.status !== 'screening' && app.status !== 'sourced' },
    { name: 'Interview', desc: 'Completed voice conversational session with Interviewer Agent.', date: '2026-07-02', done: app.status === 'interviewed' || app.status === 'hr_round' || app.status === 'decided' },
    { name: 'HR Round', desc: 'Live 1:1 human video call evaluation with HR representative.', date: app.hrRoundScheduledAt || '2026-07-24', done: app.hrRoundStatus === 'PASSED' || app.status === 'decided' },
    { name: 'Decision', desc: 'Final structured scoring compiled. Outcome determined.', date: '2026-07-25', done: app.status === 'decided' },
  ];

  const matchPercent = app.scores?.composite || 94;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Link
            href="/candidate/applications"
            className="hover:text-brand-600 dark:hover:text-orange-400 transition-colors"
          >
            Applications
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
          <span className="text-slate-800 dark:text-slate-200 font-bold line-clamp-1">{app.jobTitle}</span>
        </div>

        <Link
          href={`/candidate/jobs/${app.jobId}`}
          className="text-xs font-bold text-brand-600 dark:text-orange-400 hover:underline flex items-center gap-1"
        >
          <span>View Original Job Listing</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Header Banner Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/60 dark:border-slate-800 bg-gradient-to-br from-white/70 via-white/50 to-slate-50/50 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-slate-950/80 p-6 md:p-8 shadow-md backdrop-blur-md glass-panel flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4 min-w-0">
          {/* Company Logo Component */}
          <CompanyLogo name={app.orgName} logoUrl={job?.orgLogo} size="xl" className="shadow-md flex-shrink-0" />

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Application Tracking
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> {matchPercent}% AI Qualification Score
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-1 font-display leading-tight">
              {app.jobTitle}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span className="font-bold text-brand-600 dark:text-orange-400 flex items-center gap-1">
                {app.orgName}
                <ShieldCheck className="h-3.5 w-3.5 text-blue-500 fill-blue-500/10" />
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Clock className="h-3.5 w-3.5" /> Applied on {app.appliedDate}
              </span>
            </div>
          </div>
        </div>

        {/* Status Pill Badge */}
        <div className="flex items-center gap-3 flex-shrink-0 self-start md:self-auto">
          <span
            className={`text-xs font-extrabold px-4 py-1.5 rounded-full border uppercase tracking-wider shadow-2xs ${
              app.status === 'decided'
                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : app.status === 'interview_scheduled'
                ? 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                : 'bg-brand-50 dark:bg-orange-950/80 text-brand-700 dark:text-orange-300 border-brand-200 dark:border-orange-800'
            }`}
          >
            {app.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Stage Pipeline & AI Scorecard */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stage Pipeline Timeline Card */}
          <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/60 p-6 md:p-8 shadow-sm backdrop-blur-md glass-panel space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
                <Layers className="h-4.5 w-4.5 text-brand-500 dark:text-orange-400" />
                Stage Pipeline
              </h2>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Stage {stages.filter((s) => s.done).length} of {stages.length} Completed
              </span>
            </div>

            <div className="space-y-8 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200/80 dark:before:bg-slate-800">
              {stages.map((st, idx) => (
                <div key={idx} className="flex items-start gap-4 relative z-10">
                  <div
                    className={`h-8 w-8 rounded-full border-2 flex items-center justify-center font-extrabold text-xs shadow-2xs transition-all flex-shrink-0 ${
                      st.done
                        ? 'bg-emerald-500 border-emerald-600 dark:bg-emerald-600 dark:border-emerald-500 text-white'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {st.done ? <Check className="h-4 w-4 stroke-[3]" /> : idx + 1}
                  </div>

                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={`text-sm font-extrabold font-display ${
                          st.done ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {st.name}
                      </h4>
                      {st.done && (
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                          {st.date}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal leading-relaxed">
                      {st.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Scorecard Breakdown (if scores exist) */}
          {app.scores && (
            <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/60 p-6 md:p-8 shadow-sm backdrop-blur-md glass-panel space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-display">
                    AI Evaluation Scorecard
                  </h3>
                </div>
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-900/60">
                  Overall Composite: {app.scores.composite}%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Technical Qualification</span>
                    <span className="text-brand-600 dark:text-orange-400">{app.scores.technical}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-500 dark:bg-orange-500"
                      style={{ width: `${app.scores.technical}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Communication & Articulation</span>
                    <span className="text-purple-600 dark:text-purple-400">{app.scores.communication}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-purple-500 dark:bg-purple-400"
                      style={{ width: `${app.scores.communication}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Problem Solving & Logic</span>
                    <span className="text-pink-600 dark:text-pink-400">{app.scores.problemSolving}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-pink-500 dark:bg-pink-400"
                      style={{ width: `${app.scores.problemSolving}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Experience Alignment</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{app.scores.experience}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400"
                      style={{ width: `${app.scores.experience}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Decision Action Panel & Next Steps */}
        <div className="space-y-6">
          {/* Offer Released Banner (if decided) */}
          {app.status === 'decided' && (
            <div className="relative overflow-hidden rounded-3xl border border-emerald-200 dark:border-emerald-800/80 bg-gradient-to-br from-emerald-50/60 via-emerald-50/30 to-teal-50/40 dark:from-emerald-950/50 dark:via-emerald-900/30 dark:to-teal-950/40 p-6 shadow-md backdrop-blur-md glass-panel space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-extrabold">
                  <Gift className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-display">Offer Released!</span>
                </div>
                {offer && (
                  <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/80 px-2.5 py-1 rounded-lg">
                    {offer.baseSalary}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Congratulations! The hiring decision team has compiled your evaluation and extended an official offer.
              </p>

              <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 text-xs text-slate-700 dark:text-slate-200 italic font-medium shadow-2xs">
                &ldquo;Candidate showcased expert layout design and responsive styling logic. Exceeds qualification requirements.&rdquo;
              </div>

              {offer && (
                <Link
                  href={`/candidate/applications/${app.id}/offer`}
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-extrabold py-3 text-xs shadow-md transition-all cursor-pointer hover:scale-[1.02]"
                >
                  <span>Review & Sign Offer</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          )}

          {/* Interview Scheduled Status Box */}
          {app.status === 'interview_scheduled' && (
            <div className="rounded-3xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/40 p-6 shadow-md backdrop-blur-md glass-panel space-y-4">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold">
                <Calendar className="h-5 w-5" />
                <span className="text-sm font-display">Interview Scheduled</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Your AI Voice Interview session is confirmed for{' '}
                <span className="text-slate-900 dark:text-slate-100 font-bold">{app.confirmedSlot || 'July 24, 2026 at 2:00 PM'}</span>.
              </p>
              <Link
                href={`/interview/${app.id}`}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-extrabold py-3 text-xs shadow-md transition-all cursor-pointer hover:scale-[1.02]"
              >
                <Video className="h-4 w-4" />
                <span>Join Live Interview Room</span>
              </Link>
            </div>
          )}

          {/* Human HR Round Status Box */}
          {(app.status === 'hr_round' || app.stage === 'HR Round') && (
            <div className="rounded-3xl border border-brand-200 dark:border-orange-800/80 bg-brand-50/50 dark:bg-orange-950/40 p-6 shadow-md backdrop-blur-md glass-panel space-y-4">
              <div className="flex items-center gap-2 text-brand-700 dark:text-orange-300 font-extrabold">
                <Video className="h-5 w-5 text-brand-600 dark:text-orange-400" />
                <span className="text-sm font-display">Human HR Round Ready</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Congratulations! You passed all automated AI vetting rounds. Your live 1:1 video call with HR is ready.
              </p>
              <Link
                href={`/candidate/hr-round/${app.id}`}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-extrabold py-3 text-xs shadow-md transition-all cursor-pointer hover:scale-[1.02]"
              >
                <Video className="h-4 w-4" />
                <span>Enter HR Round Room</span>
              </Link>
            </div>
          )}

          {/* Next Steps Items List */}
          {nextSteps.length > 0 && (
            <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/60 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-display border-b border-slate-200/60 dark:border-slate-800 pb-3">
                Next Steps
              </h3>

              <div className="space-y-3">
                {nextSteps.map((step) => (
                  <Link
                    key={step.href}
                    href={step.href}
                    className={`group flex items-center gap-3.5 rounded-2xl border p-4 transition-all duration-200 ${toneClass[step.tone]}`}
                  >
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 flex-shrink-0 shadow-2xs">
                      <step.icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-orange-400 transition-colors">
                          {step.label}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${badgeToneClass[step.tone]}`}>
                          {step.badge}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mt-1 line-clamp-1">
                        {step.desc}
                      </span>
                    </div>

                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* AI Practice Promo Card */}
          <div className="rounded-3xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 p-6 shadow-sm backdrop-blur-md glass-panel space-y-3">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-extrabold">
              <Sparkles className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-xs font-display">Practice Before Your Interview</h3>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Prepare using interactive voice interview models tailored for {app.orgName}'s evaluation criteria.
            </p>
            <Link
              href={`/candidate/mock/new?company=${encodeURIComponent(app.orgName)}&role=${encodeURIComponent(app.jobTitle)}`}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-brand-600 dark:text-orange-400 hover:underline pt-1 cursor-pointer"
            >
              <span>Start Mock Simulation</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
