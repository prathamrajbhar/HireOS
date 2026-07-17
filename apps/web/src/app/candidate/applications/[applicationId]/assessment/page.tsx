'use client';

import React, { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { mockAssessments, mockAssessmentQuestions } from '@/lib/mockData';
import { ChevronRight, Award, Clock, ChevronLeft, ArrowRight, BarChart3, Star, AlertCircle } from 'lucide-react';

export default function CandidateAssessmentPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = use(params);

  // Find matching assessment or default to first
  const initialAssessment = mockAssessments.find((a) => a.applicationId === applicationId) || mockAssessments[0];
  const [assessment, setAssessment] = useState(initialAssessment);

  // Timed exam simulator states
  const [examActive, setExamActive] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes for simulation

  const handleSubmitExam = useCallback(() => {
    setExamActive(false);
    // Simulate passing results
    setAssessment((prev) => ({
      ...prev,
      status: 'completed',
      completedDate: new Date().toISOString().slice(0, 10),
      durationMinutes: Math.round((180 - timeRemaining) / 60) || 1,
      overallScore: 82,
      percentile: 88,
      sectionScores: [
        { section: 'Quantitative Reasoning', score: 85, benchmark: 70 },
        { section: 'Coding Logic', score: 90, benchmark: 75 },
        { section: 'Situational Judgment', score: 72, benchmark: 65 },
      ],
      traits: [
        { trait: 'Collaboration', score: 85, description: 'Prefers alignment and direct conversation to resolve conflicts.' },
        { trait: 'Adaptability', score: 78, description: 'Maintains composure and performance under tight deadlines.' },
      ],
    }));
  }, [timeRemaining]);

  useEffect(() => {
    if (!examActive || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examActive, timeRemaining, handleSubmitExam]);

  const handleStartExam = () => {
    setExamActive(true);
    setTimeRemaining(180);
  };

  const handleSelectAnswer = (questionId: string, value: string) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentQ = mockAssessmentQuestions[currentIdx];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <Link href="/candidate/applications" className="hover:text-indigo-650 transition-colors">Applications</Link>
        <ChevronRight className="h-3 w-3 text-slate-305" />
        <Link href={`/candidate/applications/${applicationId}`} className="hover:text-indigo-655 transition-colors">{assessment.assessmentName}</Link>
        <ChevronRight className="h-3 w-3 text-slate-300" />
        <span className="text-slate-800">Assessment Portal</span>
      </div>

      {examActive ? (
        // TIMED EXAM INTERACTIVE CONSOLE
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Question panel */}
          <div className="lg:col-span-3 rounded-3xl border border-white/60 bg-white/45 p-6 sm:p-8 shadow-md backdrop-blur-md glass-panel space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Question {currentIdx + 1} of {mockAssessmentQuestions.length}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1 rounded-full animate-pulse">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatTime(timeRemaining)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-805 leading-relaxed">
                {currentQ.prompt}
              </h3>

              {currentQ.options ? (
                <div className="space-y-2.5 pt-2">
                  {currentQ.options.map((opt) => {
                    const isSelected = answers[currentQ.id] === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => handleSelectAnswer(currentQ.id, opt)}
                        className={`w-full text-left p-4 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${isSelected
                            ? 'border-indigo-505 bg-indigo-50/50 text-indigo-705 shadow-sm'
                            : 'border-slate-200 bg-white/30 hover:bg-white/60'
                          }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  {/* Slider or rating for personality traits scale */}
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1">
                    <span>STRONGLY DISAGREE</span>
                    <span>NEUTRAL</span>
                    <span>STRONGLY AGREE</span>
                  </div>
                  <div className="flex gap-2.5 justify-between">
                    {['1', '2', '3', '4', '5'].map((num) => {
                      const isSelected = answers[currentQ.id] === num;
                      return (
                        <button
                          key={num}
                          onClick={() => handleSelectAnswer(currentQ.id, num)}
                          className={`h-11 w-11 rounded-full border text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${isSelected
                              ? 'border-indigo-505 bg-indigo-50/50 text-indigo-705 shadow-sm scale-105'
                              : 'border-slate-200 bg-white/30 hover:bg-white/60'
                            }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-between">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((prev) => prev - 1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/70 hover:bg-white px-4 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              {currentIdx < mockAssessmentQuestions.length - 1 ? (
                <button
                  onClick={() => setCurrentIdx((prev) => prev + 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white px-5 py-2.5 text-xs font-bold shadow-sm cursor-pointer"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmitExam}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-bold shadow-sm cursor-pointer"
                >
                  Submit Assessment
                </button>
              )}
            </div>
          </div>

          {/* Sidebar tracker grid */}
          <div className="rounded-3xl border border-white/60 bg-white/45 p-6 shadow-md backdrop-blur-md glass-panel space-y-4">
            <h4 className="text-xs font-bold text-slate-805">Questions Panel</h4>
            <div className="grid grid-cols-5 gap-2">
              {mockAssessmentQuestions.map((q, idx) => {
                const answered = !!answers[q.id];
                const active = currentIdx === idx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-9 w-9 rounded-xl border text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer ${active
                        ? 'border-indigo-600 bg-indigo-600/10 text-indigo-700 scale-105'
                        : answered
                          ? 'border-indigo-200 bg-indigo-50/40 text-indigo-600'
                          : 'border-slate-200 bg-white/30 hover:bg-white/60'
                      }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed pt-2 border-t border-slate-100">
              Answers save automatically as you proceed. You can edit answers until you click submit.
            </p>
          </div>
        </div>
      ) : (
        // RENDER DETAILS OR SCORES
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/60 bg-white/45 p-6 shadow-md backdrop-blur-md glass-panel flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 text-xl font-bold shadow-sm flex-shrink-0">
                <Award className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{assessment.assessmentName}</h1>
                <p className="text-xs text-slate-500 font-semibold">Category: <span className="text-indigo-600 font-bold uppercase">{assessment.category}</span></p>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${assessment.status === 'completed'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-indigo-50 text-indigo-700 border-indigo-100'
              }`}>
              {assessment.status.replace('_', ' ')}
            </span>
          </div>

          {assessment.status === 'completed' ? (
            // SCORECARD REPORT VIEW
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Scores Detail Grid */}
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-3xl border border-white/60 bg-white/45 p-6 sm:p-8 shadow-md backdrop-blur-md glass-panel space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5"><BarChart3 className="h-4.5 w-4.5 text-indigo-550" />Assessment Breakdown</h3>
                    <p className="text-[11px] text-slate-450 font-semibold mt-0.5">Composite vetting compared against role benchmark guidelines.</p>
                  </div>

                  <div className="space-y-5">
                    {assessment.sectionScores?.map((sec) => (
                      <div key={sec.section} className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span className="font-bold text-slate-800">{sec.section}</span>
                          <div className="flex gap-2">
                            <span>Score: <strong className="text-indigo-600 font-extrabold">{sec.score}%</strong></span>
                            <span className="text-slate-300">|</span>
                            <span>Benchmark: <strong className="text-slate-500 font-extrabold">{sec.benchmark}%</strong></span>
                          </div>
                        </div>
                        {/* Comparison Progress slider bar */}
                        <div className="w-full bg-slate-200/50 rounded-full h-2 p-0.5 border border-slate-100/40 relative">
                          {/* Benchmark Tick Indicator */}
                          <div className="absolute top-[-3px] w-0.5 h-3.5 bg-slate-500 z-10" style={{ left: `${sec.benchmark}%` }} title="Role benchmark" />
                          <div className="bg-indigo-500 h-1 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.3)]" style={{ width: `${sec.score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Date details */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4 text-slate-400" /> Duration: {assessment.durationMinutes} minutes</span>
                    <span>Completed on: {assessment.completedDate}</span>
                  </div>
                </div>
              </div>

              {/* Sidebar Score Percentile & Traits */}
              <div className="space-y-6">
                {/* Composite block card */}
                <div className="rounded-3xl border border-white/60 bg-white/45 p-6 shadow-md backdrop-blur-md glass-panel text-center space-y-4">
                  <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 border-2 border-indigo-200 text-indigo-700 font-black text-2xl shadow-inner relative">
                    {assessment.overallScore}%
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-850">Overall Vetting Score</h4>
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 mt-2">
                      <Star className="h-3 w-3" />
                      {assessment.percentile}th percentile
                    </span>
                  </div>
                </div>

                {/* Personality traits */}
                {assessment.traits && (
                  <div className="rounded-3xl border border-white/60 bg-white/45 p-6 shadow-md backdrop-blur-md glass-panel space-y-3">
                    <h4 className="text-xs font-bold text-slate-805 border-b border-slate-100 pb-2">Traits Calibration</h4>
                    <div className="space-y-3">
                      {assessment.traits.map((trait) => (
                        <div key={trait.trait} className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-800 block">{trait.trait} ({trait.score}%)</span>
                          <span className="text-[10px] text-slate-450 leading-relaxed font-semibold block">{trait.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // NOT STARTED EXAM NUDGE
            <div className="rounded-3xl border border-white/60 bg-white/45 p-8 shadow-xl backdrop-blur-md glass-panel text-center max-w-lg mx-auto space-y-6">
              <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 mx-auto">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-slate-900">Aptitude & Coding Test</h2>
                <p className="text-xs text-slate-550 font-semibold max-w-sm mx-auto leading-relaxed">
                  This is a timed test to evaluate your math, logic, and coding skills.
                </p>
              </div>
              <div className="bg-indigo-50/30 border border-indigo-100/50 p-4 rounded-2xl text-[11px] font-semibold text-slate-505 text-left max-w-md mx-auto space-y-1.5">
                <span className="text-indigo-950 font-bold block uppercase tracking-wide">Test Guidelines</span>
                <p>• Duration: 15 minutes</p>
                <p>• Structure: 5 multi-choice logic questions</p>
                <p>• Avoid reloading the tab once test begins.</p>
              </div>
              <button
                onClick={handleStartExam}
                className="w-full max-w-md rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 text-xs shadow-md transition-all cursor-pointer"
              >
                Start Test
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
