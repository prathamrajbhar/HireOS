'use client';

import React, { useState, use, useEffect } from 'react';
import Link from 'next/link';
import { mockApplications, mockJobs, Application, getStoredJobs } from '@/lib/mockData';
import { ChevronRight, Scale, Link2, Globe, Video, Code, ClipboardCheck, CheckCircle2, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import SkillsScorecard from './components/SkillsScorecard';
import DecisionControl from './components/DecisionControl';

export default function HrCandidateEvaluationPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = use(params);
  const [app, setApp] = useState<any>(null);
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [viewCodeOpen, setViewCodeOpen] = useState(true);

  const jobsList = getStoredJobs();
  const job = app ? jobsList.find((j) => j.id === app.jobId) : undefined;
  const showApprovalButtons = job ? !job.thresholds.autoOffer : true;

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

    // Merge scores and feedback
    let mergedScores = defaultAppObj.scores;
    let mergedReasoning = defaultAppObj.reasoning;

    if (assessData) {
      mergedScores = {
        composite: Math.round(((assessData.overallScore || 80) + (voiceInterviewData?.score || 78)) / 2),
        technical: assessData.codingScore || 80,
        communication: voiceInterviewData?.rubric?.communication || defaultAppObj.scores?.communication || 75,
        problemSolving: assessData.mcqScore || 80,
        experience: defaultAppObj.scores?.experience || 75,
        confidence: voiceInterviewData?.rubric?.cultureFit || defaultAppObj.scores?.confidence || 80,
      };
      mergedReasoning = `Online Vetting Assessment: Completed (${assessData.overallScore}% score). MCQ Logic: ${assessData.mcqScore}%, Coding algorithm: ${assessData.codingScore}%. ` + (voiceInterviewData?.feedback || defaultAppObj.reasoning);
    } else if (voiceInterviewData) {
      mergedScores = {
        composite: voiceInterviewData.score,
        technical: voiceInterviewData.rubric.technical,
        communication: voiceInterviewData.rubric.communication,
        problemSolving: Math.floor(voiceInterviewData.score * 0.95),
        experience: Math.floor(voiceInterviewData.score * 0.92),
        confidence: Math.floor(voiceInterviewData.score * 0.98),
      };
      mergedReasoning = voiceInterviewData.feedback || defaultAppObj.reasoning;
    }

    setApp({
      ...defaultAppObj,
      scores: mergedScores,
      reasoning: mergedReasoning,
    });
  }, [applicationId]);

  if (!app) {
    return <div className="text-center text-xs text-slate-400 p-8 font-bold">Loading candidate profile...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <Link href="/hr/dashboard" className="hover:text-purple-600 transition-colors">Overview</Link>
        <ChevronRight className="h-3 w-3 text-slate-300" />
        <Link href={`/hr/jobs/${app.jobId}/pipeline`} className="hover:text-purple-600 transition-colors">Pipeline</Link>
        <ChevronRight className="h-3 w-3 text-slate-300" />
        <span className="text-slate-800">{app.candidateName}</span>
      </div>

      {/* Header */}
      <div className="rounded-3xl border border-white/60 bg-white/45 p-6 shadow-md backdrop-blur-md glass-panel flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-4">
          <Image src={app.candidateAvatar} alt={app.candidateName} width={56} height={56} className="h-14 w-14 rounded-2xl border border-purple-100 shadow" unoptimized />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{app.candidateName}</h1>
              <div className="flex gap-1 text-slate-400">
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-indigo-600"><Link2 className="h-4 w-4" /></a>
                <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-slate-800"><Globe className="h-4 w-4" /></a>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-400 block mt-0.5">{app.candidateEmail}</span>
            <span className="text-[10px] text-slate-400 block mt-1">Applied on {app.appliedDate}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="block text-3xl font-extrabold text-emerald-600">{app.scores?.composite || 0}%</span>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Composite Rating</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          <SkillsScorecard scores={app.scores} />

          {/* Dynamic feedback overview */}
          <div className="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
            <h3 className="text-sm font-bold text-slate-850 border-b border-slate-100 pb-2">AI Agent Vetting Reasoning</h3>
            <p className="text-xs text-slate-655 leading-relaxed font-semibold">{app.reasoning}</p>
          </div>

          {/* 1. Dynamic Assessment Section (Displays if completed) */}
          {assessmentData && (
            <div className="rounded-3xl border border-amber-100 bg-amber-50/5 p-6 shadow-sm backdrop-blur-md glass-panel space-y-5 animate-in slide-in-from-top-3 duration-250">
              <div className="flex items-center justify-between border-b border-amber-100/50 pb-2.5">
                <div className="flex items-center gap-2 text-amber-700 font-bold">
                  <ClipboardCheck className="h-5 w-5" />
                  <h3 className="text-sm">Online Assessment Scorecard</h3>
                </div>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-3 py-0.5 rounded-full uppercase">
                  Vetting: {assessmentData.overallScore}%
                </span>
              </div>

              {/* Subsection scores */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/40 border border-slate-200/50 p-3 rounded-2xl text-xs font-semibold text-slate-600">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">MCQ Logic Vetting</span>
                  <span className="text-base font-extrabold text-slate-800 mt-1 block">{assessmentData.mcqScore}%</span>
                </div>
                <div className="bg-white/40 border border-slate-200/50 p-3 rounded-2xl text-xs font-semibold text-slate-600">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Coding Algorithmic Logic</span>
                  <span className="text-base font-extrabold text-slate-800 mt-1 block">{assessmentData.codingScore}%</span>
                </div>
              </div>

              {/* MCQ Response Analysis */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Concept Answers sheet</span>
                <div className="border border-slate-200/60 rounded-2xl overflow-hidden bg-white/30 text-xs font-semibold">
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-100/70 border-b border-slate-200/80 text-[10px] text-slate-450 font-bold uppercase">
                    <span>Question</span>
                    <span>Candidate Answer</span>
                    <span className="text-right">Result</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    <div className="grid grid-cols-3 gap-2 p-2.5 items-center">
                      <span className="text-slate-800 truncate">aq-1: Fleet Orders Rates</span>
                      <span className="text-slate-500">{assessmentData.mcqAnswers?.['aq-1'] || 'No answer'}</span>
                      <span className="text-right text-emerald-600 font-bold">✅ Correct</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 p-2.5 items-center">
                      <span className="text-slate-800 truncate">aq-2: O(1) average lookup</span>
                      <span className="text-slate-500">{assessmentData.mcqAnswers?.['aq-2'] || 'No answer'}</span>
                      <span className="text-right text-emerald-600 font-bold">✅ Correct</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 p-2.5 items-center">
                      <span className="text-slate-800 truncate">aq-3: Checkout conversion %</span>
                      <span className="text-slate-500">{assessmentData.mcqAnswers?.['aq-3'] || 'No answer'}</span>
                      <span className="text-right text-emerald-600 font-bold">✅ Correct</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monospace Code Viewer */}
              {assessmentData.submittedCode && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setViewCodeOpen(!viewCodeOpen)}
                    className="w-full flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <span>Submitted Algorithm Code ({assessmentData.selectedLanguage})</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${viewCodeOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {viewCodeOpen && (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-900 shadow-md">
                      <div className="bg-slate-950 text-[10px] font-mono p-4 overflow-x-auto text-emerald-400 whitespace-pre leading-relaxed max-h-72">
                        <div className="absolute top-2 right-2 text-[9px] bg-slate-900 border border-slate-800 text-slate-450 px-2 py-0.5 rounded font-sans uppercase font-bold">
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
          <div className="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Screening Gap Analysis</h3>
            <div className="space-y-3.5 text-xs text-slate-600 font-semibold leading-relaxed">
              <div>
                <span className="font-bold text-slate-800 block">Matched Qualifications</span>
                <p className="mt-1">Excellent typescript configuration capabilities, react concurrent streaming, aspect ratio layout shift adjustments.</p>
              </div>
              <div>
                <span className="font-bold text-slate-800 block">Gaps & Weaknesses</span>
                <p className="mt-1">Relatively light backend experience, lacks extensive distributed queuing knowledge (e.g. BullMQ, RabbitMQ).</p>
              </div>
            </div>
          </div>

          {/* Bias Audit Log */}
          {app.biasReport && (
            <div className="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-indigo-650">
                <Scale className="h-4.5 w-4.5" />
                <h3 className="text-sm font-bold text-slate-800">Double-Pass Bias Audit Log</h3>
              </div>
              <div className="space-y-3.5 text-xs font-semibold text-slate-600">
                <div className="flex justify-between items-center bg-emerald-50/50 border border-emerald-100/50 p-2.5 rounded-xl text-emerald-700">
                  <span>Auditor Score Normalized</span>
                  <span className="font-bold">{app.biasReport.overallScore}% reliability</span>
                </div>
                <p className="leading-relaxed">{app.biasReport.explanation}</p>
                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Gender Check</span>
                    <span className="text-slate-700 mt-1 block">{app.biasReport.genderBiasCheck}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Origin Bias Check</span>
                    <span className="text-slate-700 mt-1 block">{app.biasReport.originBiasCheck}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right side: Decision board & Replay Link */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/60 bg-white/40 p-5 shadow-sm backdrop-blur-md glass-panel text-center">
            <h3 className="text-xs font-bold text-slate-800 block mb-2">Interview Session Replay</h3>
            <span className="text-[10px] text-slate-400 block mb-4">Listen to the recorded AI voice interview recording and dynamic transcript grading log.</span>
            <Link href={`/hr/candidates/${app.id}/interview`} className="w-full flex items-center justify-center gap-1.5 rounded-full bg-purple-650 hover:bg-purple-750 text-white font-extrabold py-3 text-xs shadow-md"><Video className="h-4 w-4" />Replay Voice Session</Link>
          </div>

          <DecisionControl
            appId={app.id}
            initialDecision={app.decision || 'hold'}
            initialReasoning={app.reasoning || ''}
            showApprovalButtons={showApprovalButtons}
          />
        </div>
      </div>
    </div>
  );
}
