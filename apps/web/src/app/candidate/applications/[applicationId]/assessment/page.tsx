'use client';

import React, { use, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { getStoredJobs, mockApplications, mockCodingProblems, mockAssessmentQuestions } from '@/lib/mockData';
import { ChevronRight, Award, Clock, ChevronLeft, ArrowRight, BarChart3, Star, AlertCircle, Play, CheckCircle2, XCircle, Code, Settings, RotateCcw, Monitor, ShieldCheck, Terminal, Cpu } from 'lucide-react';

export default function CandidateAssessmentPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = use(params);

  // Load app details
  const app = mockApplications.find((a) => a.id === applicationId) || mockApplications[0];
  const storedJobs = getStoredJobs();
  const job = storedJobs.find((j) => j.id === app.jobId) || storedJobs[0];
  const codingProblemId = job.assessmentConfig?.codingProblemId || 'virtualized-list';
  const problem = mockCodingProblems.find((p) => p.id === codingProblemId) || mockCodingProblems[0];

  // Assessment Vetting States
  const [examState, setExamState] = useState<'intro' | 'mcq' | 'coding' | 'completed'>('intro');
  const [timeRemaining, setTimeRemaining] = useState(900); // 15 minutes
  const [timerActive, setTimerActive] = useState(false);

  // Section 1: MCQ states
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});
  const [currentMcqIdx, setCurrentMcqIdx] = useState(0);

  // Section 2: Coding states
  const [selectedLanguage, setSelectedLanguage] = useState<'javascript' | 'typescript' | 'python' | 'java' | 'cpp'>('typescript');
  const [candidateCode, setCandidateCode] = useState('');
  const [leftTab, setLeftTab] = useState<'description' | 'testcase' | 'constraints'>('description');
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [consoleTab, setConsoleTab] = useState<'testcase' | 'result'>('testcase');
  const [runningTests, setRunningTests] = useState(false);
  const [testCasesStatus, setTestCasesStatus] = useState<('idle' | 'passed' | 'failed')[]>(['idle', 'idle', 'idle']);

  // Proctor simulation
  const [proctorFlags, setProctorFlags] = useState<{ type: string; time: string }[]>([]);
  const [gazeScore, setGazeScore] = useState(96);

  // Load starter code on language change
  useEffect(() => {
    if (problem) {
      setCandidateCode(problem.starterCode[selectedLanguage] || '');
    }
  }, [selectedLanguage, problem]);

  // Gaze proctor simulation
  useEffect(() => {
    if (examState !== 'mcq' && examState !== 'coding') return;
    const interval = setInterval(() => {
      setGazeScore(Math.floor(Math.random() * 6) + 93);
    }, 4000);
    return () => clearInterval(interval);
  }, [examState]);

  // Tab change detection proctor simulator
  useEffect(() => {
    if (examState !== 'mcq' && examState !== 'coding') return;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setProctorFlags((prev) => [
          ...prev,
          { type: 'Focus Lost (Tab Changed)', time: new Date().toLocaleTimeString().slice(0, 8) }
        ]);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [examState]);

  // Timer loop
  useEffect(() => {
    if (!timerActive || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitAssessment();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timerActive, timeRemaining]);

  const handleStartExam = () => {
    setExamState('mcq');
    setTimerActive(true);
  };

  const handleSelectMcq = (qId: string, option: string) => {
    setMcqAnswers({ ...mcqAnswers, [qId]: option });
  };

  const handleRunTests = () => {
    setConsoleTab('result');
    setRunningTests(true);
    
    setTimeout(() => {
      // Simulate compiler execution checks
      setRunningTests(false);
      setTestCasesStatus(['passed', 'passed', 'passed']);
    }, 1500);
  };

  const handleResetCode = () => {
    if (confirm('Reset editor to starter template? Your edits will be lost.')) {
      setCandidateCode(problem.starterCode[selectedLanguage] || '');
    }
  };

  const calculateResults = () => {
    // 5 MCQ Vetting questions score logic
    const answerKeys: Record<string, string> = {
      'aq-1': '360',
      'aq-2': 'Hash Map',
      'aq-3': '20%',
      'aq-4': '4', // Likert scale high
      'aq-5': '5',
    };

    let mcqScore = 0;
    mockAssessmentQuestions.forEach((q) => {
      const ans = mcqAnswers[q.id];
      if (ans && ans === answerKeys[q.id]) {
        mcqScore += 20;
      } else if (q.type === 'personality_scale' && ans && Number(ans) >= 4) {
        mcqScore += 20; // Personality match benchmarks
      } else if (q.type === 'personality_scale' && ans) {
        mcqScore += 10;
      }
    });

    // Coding score logic (depends on running tests)
    const codingScore = testCasesStatus.every(s => s === 'passed') ? 100 : 0;
    const compositeScore = Math.round((mcqScore + codingScore) / 2);

    return {
      mcqScore,
      codingScore,
      compositeScore,
    };
  };

  const handleSubmitAssessment = () => {
    setTimerActive(false);
    const { mcqScore, codingScore, compositeScore } = calculateResults();

    const result = {
      id: `assess-${Date.now()}`,
      applicationId,
      candidateName: app.candidateName,
      assessmentName: `${job.title} Online Assessment`,
      category: 'aptitude' as const,
      status: 'completed' as const,
      completedDate: new Date().toISOString().slice(0, 10),
      durationMinutes: Math.round((900 - timeRemaining) / 60) || 1,
      overallScore: compositeScore,
      percentile: Math.min(99, Math.max(70, Math.floor(compositeScore * 1.05))),
      sectionScores: [
        { section: 'MCQ Logic Vetting', score: mcqScore, benchmark: 75 },
        { section: 'Coding Algorithm Logic', score: codingScore, benchmark: 80 }
      ],
      submittedCode: candidateCode,
      selectedLanguage,
      codingProblemTitle: problem.title,
      mcqAnswers,
      proctorFlags,
    };

    // Save result to localStorage
    localStorage.setItem(`assessmentResult_${applicationId}`, JSON.stringify(result));
    
    // Also save simple flag to mark candidate interview details
    localStorage.setItem(`candidateAssessmentCompleted_${applicationId}`, 'true');

    setExamState('completed');
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ----------------------------------------------------
  // Render: 1. Completed Scorecard Report
  // ----------------------------------------------------
  if (examState === 'completed') {
    const localResultStr = localStorage.getItem(`assessmentResult_${applicationId}`);
    const results = localResultStr ? JSON.parse(localResultStr) : {
      overallScore: 88,
      percentile: 91,
      sectionScores: [
        { section: 'MCQ Logic Vetting', score: 80, benchmark: 75 },
        { section: 'Coding Algorithm Logic', score: 100, benchmark: 80 }
      ],
      durationMinutes: 6,
      completedDate: new Date().toISOString().slice(0, 10),
    };

    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-16 animate-in fade-in duration-250">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Link href="/candidate/applications" className="hover:text-indigo-650 transition-colors">Applications</Link>
          <ChevronRight className="h-3 w-3 text-slate-300" />
          <Link href={`/candidate/applications/${applicationId}`} className="hover:text-indigo-650 transition-colors">{app.jobTitle}</Link>
          <ChevronRight className="h-3 w-3 text-slate-300" />
          <span className="text-slate-800">Results</span>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/45 p-6 shadow-md backdrop-blur-md glass-panel flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm flex-shrink-0">
              <Award className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Assessment Completed</h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Vetting scorecard compiled successfully.</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-100 bg-emerald-50 text-emerald-700 uppercase tracking-wider">
            Completed
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border border-white/60 bg-white/45 p-6 sm:p-8 shadow-md backdrop-blur-md glass-panel space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5"><BarChart3 className="h-4.5 w-4.5 text-indigo-550" />Evaluation Report Breakdown</h3>
                <p className="text-[11px] text-slate-450 font-semibold mt-0.5">Composite assessment matching job parameters.</p>
              </div>

              <div className="space-y-5">
                {results.sectionScores?.map((sec: any) => (
                  <div key={sec.section} className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span className="font-bold text-slate-808">{sec.section}</span>
                      <div className="flex gap-2">
                        <span>Score: <strong className="text-indigo-600 font-extrabold">{sec.score}%</strong></span>
                        <span className="text-slate-300">|</span>
                        <span>Benchmark: <strong className="text-slate-500 font-extrabold">{sec.benchmark}%</strong></span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200/50 rounded-full h-2 p-0.5 border border-slate-100/40 relative">
                      <div className="absolute top-[-3px] w-0.5 h-3.5 bg-slate-500 z-10" style={{ left: `${sec.benchmark}%` }} title="Benchmark" />
                      <div className="bg-indigo-500 h-1 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.3)]" style={{ width: `${sec.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4 text-slate-400" /> Duration: {results.durationMinutes} minutes</span>
                <span>Submitted: {results.completedDate}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/60 bg-white/45 p-6 shadow-md backdrop-blur-md glass-panel text-center space-y-4">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 border-2 border-indigo-200 text-indigo-700 font-black text-2xl shadow-inner">
                {results.overallScore}%
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-850">Overall Vetting Rating</h4>
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 mt-2">
                  <Star className="h-3 w-3" />
                  {results.percentile}th percentile
                </span>
              </div>
            </div>
            
            <Link
              href={`/candidate/applications/${applicationId}`}
              className="w-full text-center rounded-full bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold py-3 text-xs shadow-md transition-all cursor-pointer block"
            >
              Return to Pipeline Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Render: 2. Instruction Intro Screen
  // ----------------------------------------------------
  if (examState === 'intro') {
    return (
      <div className="space-y-6 max-w-xl mx-auto pb-16 animate-in fade-in duration-250">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Link href="/candidate/applications" className="hover:text-indigo-650 transition-colors">Applications</Link>
          <ChevronRight className="h-3 w-3 text-slate-300" />
          <span className="text-slate-800">Online Assessment Vetting</span>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/45 p-8 shadow-xl backdrop-blur-md glass-panel text-center space-y-6">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900">Aptitude & Coding Vetting</h2>
            <p className="text-xs text-slate-550 font-semibold max-w-sm mx-auto leading-relaxed">
              This is a timed two-section assessment compiled to analyze your conceptual and algorithmic engineering competencies for the <strong>{app.jobTitle}</strong> position.
            </p>
          </div>
          
          <div className="bg-indigo-50/30 border border-indigo-100/50 p-4 rounded-2xl text-[11px] font-semibold text-slate-600 text-left space-y-2">
            <span className="text-indigo-950 font-bold block uppercase tracking-wide">Test Specifications</span>
            <div className="grid grid-cols-2 gap-3 text-slate-500 font-bold">
              <div className="border border-slate-205/50 p-2.5 rounded-xl bg-white/40">
                <span className="block text-[10px] text-slate-400">Duration</span>
                <span className="text-slate-800">15 Minutes</span>
              </div>
              <div className="border border-slate-205/50 p-2.5 rounded-xl bg-white/40">
                <span className="block text-[10px] text-slate-400">Section 1</span>
                <span className="text-slate-800">5 MCQ Vetting Queries</span>
              </div>
              <div className="border border-slate-205/50 p-2.5 rounded-xl bg-white/40">
                <span className="block text-[10px] text-slate-400">Section 2</span>
                <span className="text-slate-800">1 LeetCode Coding IDE Vetting</span>
              </div>
              <div className="border border-slate-205/50 p-2.5 rounded-xl bg-white/40 animate-pulse">
                <span className="block text-[10px] text-rose-500">Security Gate</span>
                <span className="text-rose-600 flex items-center gap-1">Proctor Focus Vetting</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              * Note: Please make sure your camera is positioned correctly. Tab switches and focus lost events will trigger proctoring warning flags.
            </p>
          </div>
          
          <button
            onClick={handleStartExam}
            className="w-full rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 text-xs shadow-md transition-all cursor-pointer"
          >
            Authenticate & Start Exam
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Render: 3. MCQ Section
  // ----------------------------------------------------
  if (examState === 'mcq') {
    const currentQ = mockAssessmentQuestions[currentMcqIdx];

    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-16 animate-in fade-in duration-200">
        <div className="flex justify-between items-center bg-white/45 border border-white/60 p-4 rounded-2xl shadow-sm backdrop-blur-md glass-panel">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase">Assessment:</span>
            <span className="text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded">
              Section 1 (MCQ Vetting)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1 rounded-full animate-pulse">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatTime(timeRemaining)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
              <Monitor className="h-3.5 w-3.5 text-slate-400" />
              <span>Proctor Match: {gazeScore}%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <div className="lg:col-span-3 rounded-3xl border border-white/60 bg-white/45 p-6 sm:p-8 shadow-md backdrop-blur-md glass-panel space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Question {currentMcqIdx + 1} of {mockAssessmentQuestions.length}
              </span>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-805 leading-relaxed">
                {currentQ.prompt}
              </h3>

              {currentQ.options ? (
                <div className="space-y-2.5 pt-2">
                  {currentQ.options.map((opt) => {
                    const isSelected = mcqAnswers[currentQ.id] === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => handleSelectMcq(currentQ.id, opt)}
                        className={`w-full text-left p-4 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${isSelected
                            ? 'border-indigo-505 bg-indigo-55/5 text-indigo-705 shadow-sm'
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
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1">
                    <span>STRONGLY DISAGREE</span>
                    <span>NEUTRAL</span>
                    <span>STRONGLY AGREE</span>
                  </div>
                  <div className="flex gap-2.5 justify-between">
                    {['1', '2', '3', '4', '5'].map((num) => {
                      const isSelected = mcqAnswers[currentQ.id] === num;
                      return (
                        <button
                          key={num}
                          onClick={() => handleSelectMcq(currentQ.id, num)}
                          className={`h-11 w-11 rounded-full border text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${isSelected
                              ? 'border-indigo-505 bg-indigo-55/5 text-indigo-750 shadow-sm scale-105'
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
                disabled={currentMcqIdx === 0}
                onClick={() => setCurrentMcqIdx((prev) => prev - 1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/70 hover:bg-white px-4 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              {currentMcqIdx < mockAssessmentQuestions.length - 1 ? (
                <button
                  onClick={() => setCurrentMcqIdx((prev) => prev + 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white px-5 py-2.5 text-xs font-bold shadow-sm cursor-pointer"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => setExamState('coding')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 text-xs font-bold shadow-sm cursor-pointer"
                >
                  Proceed to Section 2 (Coding) <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Sidebar tracker grid */}
          <div className="rounded-3xl border border-white/60 bg-white/45 p-6 shadow-md backdrop-blur-md glass-panel space-y-4">
            <h4 className="text-xs font-bold text-slate-805">Vetting Nav Panel</h4>
            <div className="grid grid-cols-5 gap-2">
              {mockAssessmentQuestions.map((q, idx) => {
                const answered = !!mcqAnswers[q.id];
                const active = currentMcqIdx === idx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentMcqIdx(idx)}
                    className={`h-9 w-9 rounded-xl border text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer ${active
                        ? 'border-indigo-600 bg-indigo-600/10 text-indigo-750 scale-105'
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
            
            {proctorFlags.length > 0 && (
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <span className="text-[9px] font-bold text-rose-500 flex items-center gap-1 uppercase">
                  <ShieldCheck className="h-3 w-3" /> Proctor Warning Alerts
                </span>
                <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                  {proctorFlags.map((flag, i) => (
                    <div key={i} className="text-[9px] font-bold text-rose-600 bg-rose-50/50 p-1.5 rounded-lg border border-rose-100 flex justify-between">
                      <span>{flag.type}</span>
                      <span className="text-rose-400">{flag.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Render: 4. LeetCode Coding Workspace (Section 2)
  // ----------------------------------------------------
  // Render dark workspace matching LeetCode
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 rounded-3xl border border-slate-800 shadow-2xl space-y-4 font-sans animate-in fade-in duration-300">
      
      {/* 1. Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-slate-400">Coding Portal</span>
          <span className="text-[9px] font-bold bg-amber-600/20 text-amber-400 border border-amber-500/35 px-2 py-0.5 rounded-md uppercase">
            Section 2 (Algorithmic Vetting)
          </span>
          <div className="h-4 w-px bg-slate-800" />
          <span className="text-xs font-bold text-slate-300 truncate max-w-xs">{problem.title}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Section Back */}
          <button
            onClick={() => setExamState('mcq')}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            ← MCQ Panel
          </button>

          {/* Proctor stats */}
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Security Proctor: Active ({gazeScore}%)</span>
          </div>

          {/* Time Counter */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-950/20 border border-rose-900/40 px-3.5 py-1.5 rounded-full animate-pulse">
            <Clock className="h-3.5 w-3.5" />
            <span>Time Left: {formatTime(timeRemaining)}</span>
          </div>
        </div>
      </div>

      {/* 2. Split Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        
        {/* Left Side: LeetCode Details Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col space-y-4 overflow-y-auto max-h-[600px]">
          {/* Navigation Tabs */}
          <div className="flex gap-4 border-b border-slate-800 pb-2 text-xs font-bold text-slate-400 select-none">
            <button
              onClick={() => setLeftTab('description')}
              className={`pb-1 border-b-2 transition-all cursor-pointer ${leftTab === 'description' ? 'border-amber-500 text-amber-500' : 'border-transparent hover:text-slate-200'}`}
            >
              Description
            </button>
            <button
              onClick={() => setLeftTab('constraints')}
              className={`pb-1 border-b-2 transition-all cursor-pointer ${leftTab === 'constraints' ? 'border-amber-500 text-amber-500' : 'border-transparent hover:text-slate-200'}`}
            >
              Constraints
            </button>
          </div>

          {/* Dynamic Tab Rendering */}
          {leftTab === 'description' ? (
            <div className="space-y-4 text-xs font-semibold leading-relaxed text-slate-300">
              <div>
                <h2 className="text-base font-extrabold text-white">{problem.title}</h2>
                <div className="flex items-center gap-2 mt-2 select-none">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                    problem.difficulty === 'Easy'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : problem.difficulty === 'Medium'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    {problem.difficulty}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">{problem.category}</span>
                </div>
              </div>

              {/* Instructions text */}
              <div className="whitespace-pre-line text-slate-350 pr-2 border-t border-slate-800/40 pt-3">
                {problem.description}
              </div>

              {/* Examples rendering */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-white block uppercase tracking-wider">Example Cases</span>
                {problem.testCases.map((tc, idx) => (
                  <div key={tc.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800/60 font-mono text-[10px] space-y-1">
                    <span className="text-amber-500 font-bold block">Example {idx + 1} ({tc.description})</span>
                    <div className="text-slate-300"><span className="text-slate-500">Input:</span> {tc.input}</div>
                    <div className="text-slate-300"><span className="text-slate-500">Expected:</span> {tc.expectedOutput}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-xs font-mono text-slate-400 leading-relaxed">
              <span className="text-xs font-bold text-white block uppercase tracking-wider font-sans mb-1">Testing Constraints</span>
              {problem.constraints.map((c, i) => (
                <div key={i} className="flex gap-2 items-start bg-slate-950 p-2.5 rounded-lg border border-slate-800/40">
                  <span className="text-amber-500">•</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Monaco IDE lookalike */}
        <div className="flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden flex-1 min-h-[350px]">
            {/* Editor Sub-header controls */}
            <div className="flex items-center justify-between bg-slate-950 px-4 py-2 border-b border-slate-800 text-[11px] font-bold text-slate-400 select-none">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-amber-505" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value as any)}
                  className="bg-transparent border-none text-slate-200 outline-none cursor-pointer focus:ring-0 font-bold"
                >
                  <option value="javascript">JavaScript (ES6)</option>
                  <option value="typescript">TypeScript (v5.0)</option>
                  <option value="python">Python (v3.10)</option>
                  <option value="java">Java (JDK 17)</option>
                  <option value="cpp">C++ (GCC 12)</option>
                </select>
                <span className="text-[9px] text-slate-550 italic bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">Auto-save: ON</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleResetCode}
                  className="hover:text-white transition-all cursor-pointer flex items-center gap-1 text-slate-450"
                  title="Reset code template"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>
            </div>

            {/* Editor Textarea styled with Gutter */}
            <div className="flex-1 flex bg-slate-950 font-mono text-xs relative">
              {/* Lines gutter gutter */}
              <div className="w-10 bg-slate-900/40 border-r border-slate-800 text-slate-600 text-right py-3.5 pr-2 select-none space-y-1">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* Monospace Input Area */}
              <textarea
                value={candidateCode}
                onChange={(e) => setCandidateCode(e.target.value)}
                className="flex-grow bg-transparent border-none outline-none py-3.5 px-4 text-emerald-400 select-all font-mono leading-relaxed h-full resize-none focus:ring-0 focus:outline-none"
                placeholder="// Write code here"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Test Case output console */}
          {consoleOpen && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between bg-slate-950 px-4 py-2 border-b border-slate-800 text-[10px] font-bold text-slate-450 select-none">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">Terminal console</span>
                  <button
                    onClick={() => setConsoleTab('testcase')}
                    className={`pb-0.5 border-b transition-all cursor-pointer ${consoleTab === 'testcase' ? 'border-amber-500 text-amber-500' : 'border-transparent hover:text-slate-200'}`}
                  >
                    Test Cases
                  </button>
                  <button
                    onClick={() => setConsoleTab('result')}
                    className={`pb-0.5 border-b transition-all cursor-pointer ${consoleTab === 'result' ? 'border-amber-500 text-amber-500' : 'border-transparent hover:text-slate-200'}`}
                  >
                    Result Logs
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-950 font-mono text-[10px] leading-relaxed max-h-36 overflow-y-auto">
                {consoleTab === 'testcase' ? (
                  <div className="space-y-2">
                    {problem.testCases.map((tc, index) => (
                      <div key={tc.id} className="text-slate-400">
                        <span className="text-slate-550 font-bold">Case {index + 1}:</span> {tc.input}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {runningTests ? (
                      <div className="flex items-center gap-2 text-amber-400 animate-pulse font-bold">
                        <Cpu className="h-4 w-4 animate-spin" />
                        <span>Compiling code and executing test suites...</span>
                      </div>
                    ) : testCasesStatus[0] === 'idle' ? (
                      <div className="text-slate-500 font-bold italic">Click "Run Tests" to execute compiled code.</div>
                    ) : (
                      <div className="space-y-2 font-mono">
                        <div className="text-emerald-400 font-black flex items-center gap-1 select-none">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Simulation Run Success: All cases passed (3/3)</span>
                        </div>
                        <div className="divide-y divide-slate-900 border-t border-slate-900 mt-2 pt-2 space-y-1 text-slate-350">
                          {problem.testCases.map((tc, idx) => (
                            <div key={tc.id} className="py-1">
                              <span className="text-emerald-500 font-bold block">Test Case {idx + 1}: Passed</span>
                              <div className="text-slate-400"><span className="text-slate-600">Expected:</span> {tc.expectedOutput}</div>
                              <div className="text-slate-400"><span className="text-slate-600">Output:</span> {tc.expectedOutput}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between select-none">
            <button
              onClick={() => setConsoleOpen(!consoleOpen)}
              className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer flex items-center gap-1"
            >
              <Terminal className="h-3.5 w-3.5" /> Console
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRunTests}
                disabled={runningTests}
                className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-white transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Play className="h-3.5 w-3.5 text-emerald-500" /> Run Code
              </button>
              
              <button
                onClick={handleSubmitAssessment}
                className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-black text-white shadow-md transition-all cursor-pointer"
              >
                Submit Vetting Exam
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
