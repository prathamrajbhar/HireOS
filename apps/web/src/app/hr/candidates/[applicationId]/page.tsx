'use client';

import React, { useState, use, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { mockApplications, getStoredJobs } from '@/lib/mockData';
import {
  ChevronRight,
  Scale,
  Link2,
  Globe,
  Video,
  Code,
  ClipboardCheck,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  Clock,
  Eye,
  Zap,
  Briefcase,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
} from '@/lib/lucide-google-icons';
import SkillsScorecard from './components/SkillsScorecard';
import DecisionControl from './components/DecisionControl';

export default function HrCandidateEvaluationPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = use(params);
  const [app, setApp] = useState<any>(null);
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [viewCodeOpen, setViewCodeOpen] = useState(true);

  useEffect(() => {
    const defaultAppObj = mockApplications.find((a) => a.id === applicationId) || mockApplications[0];
    
    // Check for AI Voice interview logs
    let voiceInterviewData: any = null;
    const localVoice = localStorage.getItem(`candidateInterview_${applicationId}`);
    if (localVoice) {
      try {
        voiceInterviewData = JSON.parse(localVoice);
      } catch {}
    }

    // Check for Online Assessment (MCQ + Coding) logs
    let assessData: any = null;
    const localAssess = localStorage.getItem(`assessmentResult_${applicationId}`);
    if (localAssess) {
      try {
        assessData = JSON.parse(localAssess);
        setAssessmentData(assessData);
      } catch {}
    }

    // Merge scores and feedback fallback
    let mergedScores = defaultAppObj.scores || {
      composite: 86,
      technical: 88,
      communication: 82,
      problemSolving: 85,
      experience: 89,
      confidence: 90,
    };
    let mergedReasoning = defaultAppObj.reasoning || 'Demonstrated competent understanding of senior software engineering architecture. Clean execution paths and solid Big-O analysis.';

    if (assessData) {
      mergedScores = {
        composite: Math.round(((assessData.overallScore || 80) + (voiceInterviewData?.score || 78)) / 2),
        technical: assessData.codingScore || 80,
        communication: voiceInterviewData?.rubric?.communication || mergedScores.communication || 75,
        problemSolving: assessData.mcqScore || 80,
        experience: mergedScores.experience || 75,
        confidence: voiceInterviewData?.rubric?.cultureFit || mergedScores.confidence || 80,
      };
      mergedReasoning = `Online Vetting Assessment: Completed (${assessData.overallScore}% score). MCQ Logic: ${assessData.mcqScore}%, Coding algorithm: ${assessData.codingScore}%. ` + (voiceInterviewData?.feedback || mergedReasoning);
    } else if (voiceInterviewData) {
      mergedScores = {
        composite: voiceInterviewData.score,
        technical: voiceInterviewData.rubric.technical,
        communication: voiceInterviewData.rubric.communication,
        problemSolving: Math.floor(voiceInterviewData.score * 0.95),
        experience: Math.floor(voiceInterviewData.score * 0.92),
        confidence: Math.floor(voiceInterviewData.score * 0.98),
      };
      mergedReasoning = voiceInterviewData.feedback || mergedReasoning;
    }

    setApp({
      ...defaultAppObj,
      scores: mergedScores,
      reasoning: mergedReasoning,
    });
  }, [applicationId]);

  if (!app) {
    return <div className="text-center text-xs text-slate-400 dark:text-slate-500 p-8 font-bold">Loading candidate profile...</div>;
  }

  const jobsList = getStoredJobs();
  const job = jobsList.find((j) => j.id === app.jobId);
  const hasFlags = app.biasReport && app.biasReport.flaggedPhrases?.length > 0;

  // Handler to generate and download candidate PDF resume
  const handleDownloadResume = () => {
    const content = `=================================================\nHireOS CANDIDATE DOSSIER & RESUME: ${app.candidateName.toUpperCase()}\nEmail: ${app.candidateEmail}\nPipeline Stage: ${app.stage}\nAI Readiness Score: ${app.scores?.composite || 85}%\n=================================================\n\nCANDIDATE SNAPSHOT:\n- Position Applied: ${job?.title || app.jobTitle || 'Senior Frontend Engineer'}\n- Total Experience: 5+ Years\n- Location: San Francisco, CA (Remote)\n- Availability: Immediate (2 Weeks Notice)\n- Primary Tech Stack: React, TypeScript, Next.js, Node.js, System Architecture\n\nPROFESSIONAL EXPERIENCE:\n\n1. Senior Frontend Engineer — TechCorp (2022 - Present)\n   - Built high-throughput order checkout pipelines serving 5M daily users.\n   - Virtualized menu lists and improved LCP by 42%.\n   - Managed micro-frontend state isolation and performance telemetry.\n\n2. Software Engineer — DataSystems (2020 - 2022)\n   - Architected React component libraries with TypeScript & Tailwind.\n   - Reduced bundle sizes by 35% through tree-shaking and dynamic code splitting.\n\nAI EVALUATION SUMMARY:\nTechnical Score: ${app.scores?.technical || 90}%\nCommunication Score: ${app.scores?.communication || 85}%\nProblem Solving Score: ${app.scores?.problemSolving || 88}%\nExperience Score: ${app.scores?.experience || 85}%\n\nEvaluator Notes: "${app.reasoning || 'Demonstrated competent understanding of senior software engineering architecture.'}"\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${app.candidateName.replace(/\s+/g, '_')}_Resume.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12 font-sans">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Link href="/hr/jobs" className="hover:text-brand-600 dark:hover:text-orange-400 transition-colors">Jobs</Link>
          <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />
          <Link href={`/hr/jobs/${app.jobId}/pipeline`} className="hover:text-brand-600 dark:hover:text-orange-400 transition-colors">Pipeline</Link>
          <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />
          <span className="text-slate-900 dark:text-slate-200 font-extrabold">{app.candidateName}</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/hr/jobs/${app.jobId}/pipeline`}
            className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Pipeline</span>
          </Link>
          <button
            type="button"
            onClick={handleDownloadResume}
            className="inline-flex items-center gap-1.5 bg-brand-600 dark:bg-orange-600 hover:bg-brand-700 dark:hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs font-extrabold transition-all shadow-md cursor-pointer hover:scale-[1.01]"
          >
            <Download className="h-4 w-4" />
            <span>Download Resume PDF</span>
          </button>
        </div>
      </div>

      {/* Main Candidate Header Card */}
      <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/45 dark:bg-slate-900/60 p-6 md:p-7 shadow-md backdrop-blur-md glass-panel flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-4">
          <Image
            src={app.candidateAvatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}
            alt={app.candidateName}
            width={60}
            height={60}
            className="h-15 w-15 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md object-cover flex-shrink-0"
            unoptimized
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-display">
                {app.candidateName}
              </h1>
              <span className="text-[10px] font-extrabold text-brand-600 dark:text-orange-400 bg-brand-50 dark:bg-orange-950/80 border border-brand-200/60 dark:border-orange-900/60 px-2.5 py-0.5 rounded-full uppercase">
                Stage: {app.stage}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{app.candidateEmail}</p>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" /> Applied on {app.appliedDate}
              </span>
              <span>•</span>
              <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  <Link2 className="h-3.5 w-3.5" />
                </a>
                <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  <Globe className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Composite Readiness Rating */}
        <div className="text-left sm:text-right bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60 p-4 rounded-2xl">
          <span className="block text-3xl md:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-display">
            {app.scores?.composite || 86}%
          </span>
          <span className="text-[10px] text-slate-600 dark:text-slate-300 font-extrabold uppercase tracking-wider block mt-0.5">
            Composite AI Rating
          </span>
        </div>
      </div>

      {/* Profile Snapshot Meta Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white/45 dark:bg-slate-900/60 border border-white/60 dark:border-slate-800 shadow-2xs glass-panel">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Total Experience</span>
          <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-1 block">5+ Years</span>
        </div>
        <div className="p-4 rounded-2xl bg-white/45 dark:bg-slate-900/60 border border-white/60 dark:border-slate-800 shadow-2xs glass-panel">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Location</span>
          <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-1 block truncate">San Francisco, CA</span>
        </div>
        <div className="p-4 rounded-2xl bg-white/45 dark:bg-slate-900/60 border border-white/60 dark:border-slate-800 shadow-2xs glass-panel">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Notice Period</span>
          <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">2 Weeks</span>
        </div>
        <div className="p-4 rounded-2xl bg-white/45 dark:bg-slate-900/60 border border-white/60 dark:border-slate-800 shadow-2xs glass-panel">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">Expected Comp</span>
          <span className="text-sm font-extrabold text-brand-600 dark:text-orange-400 mt-1 block">$165,000/yr</span>
        </div>
      </div>

      {/* Main Grid: Left Column 8 / Right Column 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Download Resume File Card */}
          <div className="p-5 rounded-3xl bg-brand-50/50 dark:bg-slate-900/90 border border-brand-200/60 dark:border-slate-800 flex items-center justify-between shadow-2xs backdrop-blur-md glass-panel">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-brand-100 dark:bg-orange-950/80 text-brand-600 dark:text-orange-400 border border-brand-200 dark:border-orange-800 flex items-center justify-center flex-shrink-0">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-display">
                  {app.candidateName.replace(/\s+/g, '_')}_Resume.pdf
                </h4>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block mt-0.5">
                  Verified Candidate PDF Resume • 1.2 MB • Uploaded on {app.appliedDate}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadResume}
              className="px-4 py-2.5 rounded-xl bg-brand-600 dark:bg-orange-600 hover:bg-brand-700 dark:hover:bg-orange-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Download className="h-4 w-4" />
              <span>Download PDF</span>
            </button>
          </div>

          {/* Verified Tech Stack Tags */}
          <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/45 dark:bg-slate-900/60 p-6 shadow-md backdrop-blur-md glass-panel space-y-3">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block border-b border-slate-200/60 dark:border-slate-800 pb-2">
              Verified Tech Stack &amp; Skill Competencies
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {(app.skills || ['React', 'TypeScript', 'Next.js', 'Node.js', 'System Architecture', 'Tailwind CSS', 'GraphQL']).map((skill: string, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-extrabold flex items-center gap-1.5 shadow-2xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Category Breakdown Scorecard */}
          <SkillsScorecard scores={app.scores} />

          {/* AI Evaluator Reasoning */}
          <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/45 dark:bg-slate-900/60 p-6 shadow-md backdrop-blur-md glass-panel space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 border-b border-slate-200/60 dark:border-slate-800 pb-2.5 font-display">
              AI Agent Vetting Reasoning
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium italic border-l-2 border-brand-500 pl-3.5 py-1 bg-slate-50/60 dark:bg-slate-800/40 rounded-r-2xl">
              &ldquo;{app.reasoning}&rdquo;
            </p>
          </div>

          {/* Work Experience Timeline */}
          <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/45 dark:bg-slate-900/60 p-6 shadow-md backdrop-blur-md glass-panel space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 border-b border-slate-200/60 dark:border-slate-800 pb-2.5 font-display">
              Work Experience History
            </h3>
            <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
              <div className="border-l-2 border-brand-500 pl-3.5 space-y-1">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">Senior Frontend Engineer — TechCorp</h4>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block">2022 - Present • 2 yrs 6 mos</span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium mt-1">
                  Built high-throughput order checkout pipelines serving 5M daily users. Virtualized menu lists and improved LCP by 42%.
                </p>
              </div>

              <div className="border-l-2 border-indigo-500 pl-3.5 space-y-1">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">Software Engineer — DataSystems</h4>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block">2020 - 2022 • 2 yrs</span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium mt-1">
                  Architected React micro-frontends with TypeScript. Managed state isolation and dynamic event bus channels.
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Assessment Section (Displays if completed) */}
          {assessmentData && (
            <div className="rounded-3xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/20 p-6 shadow-md backdrop-blur-md glass-panel space-y-5">
              <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-amber-900/60 pb-2.5">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold">
                  <ClipboardCheck className="h-5 w-5" />
                  <h3 className="text-sm font-display font-extrabold">Online Assessment Scorecard</h3>
                </div>
                <span className="text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 px-3 py-0.5 rounded-full uppercase">
                  Vetting Score: {assessmentData.overallScore}%
                </span>
              </div>

              {/* Subsection scores */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 p-3 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase block">MCQ Logic Vetting</span>
                  <span className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-1 block">{assessmentData.mcqScore}%</span>
                </div>
                <div className="bg-white/50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 p-3 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase block">Coding Algorithmic Logic</span>
                  <span className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-1 block">{assessmentData.codingScore}%</span>
                </div>
              </div>

              {/* Monospace Code Viewer */}
              {assessmentData.submittedCode && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setViewCodeOpen(!viewCodeOpen)}
                    className="w-full flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <span>Submitted Algorithm Code ({assessmentData.selectedLanguage})</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${viewCodeOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {viewCodeOpen && (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-900 shadow-md">
                      <div className="bg-slate-950 text-[10px] font-mono p-4 overflow-x-auto text-emerald-400 whitespace-pre leading-relaxed max-h-72">
                        <div className="absolute top-2 right-2 text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-sans uppercase font-bold">
                          {assessmentData.selectedLanguage}
                        </div>
                        {assessmentData.submittedCode}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Gap Analysis */}
          <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/45 dark:bg-slate-900/60 p-6 shadow-md backdrop-blur-md glass-panel space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 border-b border-slate-200/60 dark:border-slate-800 pb-2.5 font-display">
              Screening Gap Analysis
            </h3>
            <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
              <div>
                <span className="font-extrabold text-slate-900 dark:text-slate-100 block">Matched Qualifications</span>
                <p className="mt-1 text-slate-600 dark:text-slate-300 font-medium">Excellent typescript configuration capabilities, react concurrent streaming, aspect ratio layout shift adjustments.</p>
              </div>
              <div>
                <span className="font-extrabold text-slate-900 dark:text-slate-100 block">Gaps &amp; Growth Areas</span>
                <p className="mt-1 text-slate-600 dark:text-slate-300 font-medium">Relatively light backend experience, lacks extensive distributed queuing knowledge (e.g. BullMQ, RabbitMQ).</p>
              </div>
            </div>
          </div>

          {/* Bias Audit Log */}
          {app.biasReport && (
            <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/45 dark:bg-slate-900/60 p-6 shadow-md backdrop-blur-md glass-panel space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2.5 text-purple-600 dark:text-purple-400">
                <Scale className="h-4.5 w-4.5" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-display">Double-Pass Bias Audit Log</h3>
              </div>
              <div className="space-y-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <div className="flex justify-between items-center bg-emerald-50/70 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-900/60 p-3 rounded-xl text-emerald-800 dark:text-emerald-300">
                  <span>Auditor Score Normalized</span>
                  <span className="font-extrabold">{app.biasReport.overallScore}% reliability</span>
                </div>
                <p className="leading-relaxed font-medium">{app.biasReport.explanation}</p>
                <div className="grid grid-cols-2 gap-4 border-t border-slate-200/60 dark:border-slate-800 pt-3">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase block">Gender Check</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold mt-1 block">{app.biasReport.genderBiasCheck}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase block">Origin Bias Check</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold mt-1 block">{app.biasReport.originBiasCheck}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Decision Control & Replay Link (1 Col) */}
        <div className="space-y-6">
          {/* Decision Control Panel */}
          <DecisionControl
            appId={app.id}
            initialDecision={app.decision || 'hold'}
            initialReasoning={app.reasoning || ''}
            showApprovalButtons={true}
          />

          {/* Voice Session Replay */}
          <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/45 dark:bg-slate-900/60 p-6 shadow-md backdrop-blur-md glass-panel text-center space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-display">
              Interview Session Replay
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Listen to recorded AI voice interview recording and dynamic transcript grading log.
            </p>
            <button
              type="button"
              onClick={() => alert('Playing recorded AI voice session audio...')}
              className="w-full py-2.5 rounded-xl bg-brand-600 dark:bg-orange-600 hover:bg-brand-700 dark:hover:bg-orange-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Video className="h-4 w-4" />
              <span>Replay Voice Session</span>
            </button>

            {/* Engagement Telemetry Grid */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-800 text-left">
              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Gaze Contact</span>
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">96% Direct</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Speech Pacing</span>
                <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 block">140 WPM</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
