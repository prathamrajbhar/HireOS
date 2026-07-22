'use client';

import React from 'react';
import { Settings, HelpCircle, AudioLines, Code, ClipboardCheck, Video, ChevronRight, Eye } from 'lucide-react';
import { mockCodingProblems } from '@/lib/mockData';

interface PipelineConfigCardProps {
  minScore: number;
  setMinScore: (val: number) => void;
  autoOffer: boolean;
  setAutoOffer: (val: boolean) => void;
  qCount: number;
  setQCount: (val: number | ((prev: number) => number)) => void;
  enableSourcing: boolean;
  setEnableSourcing: (val: boolean) => void;
  voiceProfile: string;
  setVoiceProfile: (val: string) => void;
  
  // Custom Recruitment Process additions
  stages: ('screening' | 'assessment' | 'voice_screen' | 'panel' | 'decision')[];
  setStages: (val: ('screening' | 'assessment' | 'voice_screen' | 'panel' | 'decision')[]) => void;
  assessmentConfig: {
    mcqCount: number;
    codingProblemId: string;
    passingScore: number;
  };
  setAssessmentConfig: (val: { mcqCount: number; codingProblemId: string; passingScore: number }) => void;
}

export default function PipelineConfigCard({
  minScore,
  setMinScore,
  autoOffer,
  setAutoOffer,
  qCount,
  setQCount,
  enableSourcing,
  setEnableSourcing,
  voiceProfile,
  setVoiceProfile,
  
  stages,
  setStages,
  assessmentConfig,
  setAssessmentConfig,
}: PipelineConfigCardProps) {

  const toggleStage = (stage: 'screening' | 'assessment' | 'voice_screen' | 'panel') => {
    if (stages.includes(stage)) {
      // Must have at least one filtering stage before decision
      const remaining = stages.filter((s) => s !== stage);
      if (remaining.length > 1) {
        setStages(remaining);
      }
    } else {
      // Insert in logical sequence
      const sequenceOrder: ('screening' | 'assessment' | 'voice_screen' | 'panel' | 'decision')[] = [
        'screening',
        'assessment',
        'voice_screen',
        'panel',
        'decision',
      ];
      const nextStages = [...stages, stage].sort(
        (a, b) => sequenceOrder.indexOf(a) - sequenceOrder.indexOf(b)
      );
      setStages(nextStages);
    }
  };

  const handleConfigChange = (key: string, value: any) => {
    setAssessmentConfig({
      ...assessmentConfig,
      [key]: value,
    });
  };

  // Helper to check if a stage is active
  const isActive = (stage: 'screening' | 'assessment' | 'voice_screen' | 'panel') => stages.includes(stage);

  return (
    <div className="space-y-6">
      {/* 1. Visual Stage Sequence Builder */}
      <div className="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
        <div className="flex items-center gap-1.5 text-indigo-650 border-b border-slate-100 pb-2">
          <Settings className="h-4.5 w-4.5" />
          <h3 className="text-sm font-bold text-slate-805">Recruitment Process Designer</h3>
        </div>

        <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
          Toggle and customize the evaluation pipeline. Candidates flow through active stages sequentially.
        </p>

        {/* Visual Pipeline flow map */}
        <div className="bg-slate-950/5 border border-slate-200/50 p-4 rounded-2xl flex flex-wrap items-center gap-2 justify-center select-none">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-extrabold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
              Sourced
            </span>
            <ChevronRight className="h-3 w-3 text-slate-350" />
          </div>

          {isActive('screening') && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-150 px-2.5 py-1 rounded-lg animate-in fade-in zoom-in-95 duration-200">
                AI Screen
              </span>
              <ChevronRight className="h-3 w-3 text-slate-350" />
            </div>
          )}

          {isActive('assessment') && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-150 px-2.5 py-1 rounded-lg animate-in fade-in zoom-in-95 duration-200">
                MCQ + Coding
              </span>
              <ChevronRight className="h-3 w-3 text-slate-355" />
            </div>
          )}

          {isActive('voice_screen') && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 border border-purple-150 px-2.5 py-1 rounded-lg animate-in fade-in zoom-in-95 duration-200">
                Voice Screen
              </span>
              <ChevronRight className="h-3 w-3 text-slate-350" />
            </div>
          )}

          {isActive('panel') && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 border border-rose-155 px-2.5 py-1 rounded-lg animate-in fade-in zoom-in-95 duration-200">
                Live Panel
              </span>
              <ChevronRight className="h-3 w-3 text-slate-355" />
            </div>
          )}

          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-150 px-2.5 py-1 rounded-lg">
            Decision
          </span>
        </div>

        {/* Toggles */}
        <div className="space-y-3.5 pt-2">
          {/* Resume Screen */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`h-8 w-8 rounded-xl flex items-center justify-center border transition-all ${isActive('screening') ? 'bg-indigo-50 border-indigo-200 text-indigo-650' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                <Eye className="h-4 w-4" />
              </span>
              <div>
                <span className="text-xs font-bold text-slate-800 block">AI Resume Screening</span>
                <span className="text-[10px] text-slate-400 font-semibold block">Scan & rank applications</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive('screening')}
                onChange={() => toggleStage('screening')}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-650"></div>
            </label>
          </div>

          {/* MCQ + Coding Assessment */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`h-8 w-8 rounded-xl flex items-center justify-center border transition-all ${isActive('assessment') ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                <ClipboardCheck className="h-4 w-4" />
              </span>
              <div>
                <span className="text-xs font-bold text-slate-800 block">MCQ & Coding Assessment</span>
                <span className="text-[10px] text-slate-400 font-semibold block">LeetCode-style online testing</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive('assessment')}
                onChange={() => toggleStage('assessment')}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-650"></div>
            </label>
          </div>

          {/* AI Voice Screen */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`h-8 w-8 rounded-xl flex items-center justify-center border transition-all ${isActive('voice_screen') ? 'bg-purple-50 border-purple-200 text-purple-650' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                <AudioLines className="h-4 w-4" />
              </span>
              <div>
                <span className="text-xs font-bold text-slate-800 block">AI Voice Screening</span>
                <span className="text-[10px] text-slate-400 font-semibold block">Conversational speech agent round</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive('voice_screen')}
                onChange={() => toggleStage('voice_screen')}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-650"></div>
            </label>
          </div>

          {/* Live Panel */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`h-8 w-8 rounded-xl flex items-center justify-center border transition-all ${isActive('panel') ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                <Video className="h-4 w-4" />
              </span>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Live Panel / Take-Home</span>
                <span className="text-[10px] text-slate-400 font-semibold block">Human interview or review</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive('panel')}
                onChange={() => toggleStage('panel')}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-650"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 2. Assessment Config (Collapsible/Dynamic) */}
      {isActive('assessment') && (
        <div className="rounded-3xl border border-amber-100 bg-amber-50/10 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4 animate-in slide-in-from-top-3 duration-250">
          <div className="flex items-center gap-1.5 text-amber-700 border-b border-amber-100/50 pb-2 font-bold">
            <Code className="h-4.5 w-4.5" />
            <h3 className="text-sm">Online Assessment Configuration</h3>
          </div>

          <div className="space-y-4 text-xs font-semibold text-slate-650">
            {/* Coding Challenge Selection */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">
                Select Coding Challenge
              </label>
              <select
                value={assessmentConfig.codingProblemId}
                onChange={(e) => handleConfigChange('codingProblemId', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 bg-white/60 focus:outline-none focus:border-amber-500 focus:bg-white transition-all glass-input font-bold text-slate-805"
              >
                {mockCodingProblems.map((prob) => (
                  <option key={prob.id} value={prob.id}>
                    {prob.title} ({prob.difficulty})
                  </option>
                ))}
              </select>
            </div>

            {/* MCQ question count */}
            <div className="flex justify-between items-center py-1">
              <div>
                <span className="block text-slate-700">Quantity of MCQ Questions</span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-bold">Evaluates logic, architecture</span>
              </div>
              <div className="flex items-center gap-2 select-none border border-slate-200 rounded-lg p-1 bg-white">
                <button
                  type="button"
                  onClick={() => handleConfigChange('mcqCount', Math.max(1, assessmentConfig.mcqCount - 1))}
                  className="h-6 w-6 rounded bg-slate-50 hover:bg-slate-100 flex items-center justify-center cursor-pointer font-bold"
                >
                  -
                </button>
                <span className="w-5 text-center font-bold text-slate-800">{assessmentConfig.mcqCount}</span>
                <button
                  type="button"
                  onClick={() => handleConfigChange('mcqCount', Math.min(10, assessmentConfig.mcqCount + 1))}
                  className="h-6 w-6 rounded bg-slate-50 hover:bg-slate-100 flex items-center justify-center cursor-pointer font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Assessment passing score */}
            <div>
              <div className="flex justify-between mb-1.5 text-[11px]">
                <span className="flex items-center gap-1">Assessment Passing score</span>
                <span className="font-bold text-slate-850">{assessmentConfig.passingScore}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                value={assessmentConfig.passingScore}
                onChange={(e) => handleConfigChange('passingScore', Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Core Sourcing & Voice parameters */}
      <div className="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
        <div className="flex items-center gap-1.5 text-indigo-650 border-b border-slate-100 pb-2">
          <Settings className="h-4.5 w-4.5" />
          <h3 className="text-sm font-bold text-slate-800">Pipeline Agents Config</h3>
        </div>

        <div className="space-y-4 text-xs font-semibold text-slate-600">
          {/* Enable Sourcing Agent */}
          <div className="flex justify-between items-center py-1">
            <div>
              <span className="block text-slate-700 flex items-center gap-1">
                Sourcing Agent
                <span className="group relative inline-block cursor-help">
                  <HelpCircle className="h-3 w-3 text-slate-400" />
                  <span className="invisible group-hover:visible absolute z-50 bg-slate-800 text-white text-[9px] font-bold p-2 rounded-lg -top-8 -left-20 w-44 shadow-lg text-center leading-normal">
                    Auto-scrape, match and contact potential candidates from portals.
                  </span>
                </span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-bold">Auto-source candidates</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableSourcing}
                onChange={(e) => setEnableSourcing(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-655"></div>
            </label>
          </div>

          {/* Min Passing Score Slider */}
          <div>
            <div className="flex justify-between mb-1.5 text-[11px]">
              <span className="flex items-center gap-1">
                Min Shortlist Score
                <span className="group relative inline-block cursor-help">
                  <HelpCircle className="h-3 w-3 text-slate-400" />
                  <span className="invisible group-hover:visible absolute z-50 bg-slate-800 text-white text-[9px] font-bold p-2 rounded-lg -top-8 -left-24 w-48 shadow-lg text-center leading-normal">
                    Candidates scoring below this value are auto-rejected by screening.
                  </span>
                </span>
              </span>
              <span className="font-bold text-slate-850">{minScore}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Auto Offer Trigger */}
          <div className="flex justify-between items-center py-1">
            <div>
              <span className="block text-slate-700 flex items-center gap-1">
                Auto-Offer Contract
                <span className="group relative inline-block cursor-help">
                  <HelpCircle className="h-3 w-3 text-slate-400" />
                  <span className="invisible group-hover:visible absolute z-50 bg-slate-800 text-white text-[9px] font-bold p-2 rounded-lg -top-8 -left-20 w-44 shadow-lg text-center leading-normal">
                    Send employment contracts automatically if matching this high threshold.
                  </span>
                </span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-bold">Instantly trigger contract draft</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoOffer}
                onChange={(e) => setAutoOffer(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-355 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-650"></div>
            </label>
          </div>

          {/* Voice Profile select */}
          {isActive('voice_screen') && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1 flex items-center gap-1">
                <AudioLines className="h-3.5 w-3.5 text-indigo-500" />
                Interviewer Agent Voice
              </label>
              <select
                value={voiceProfile}
                onChange={(e) => setVoiceProfile(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 bg-white/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all glass-input text-slate-800 font-bold"
              >
                <option value="Serena (Warm/Professional)">Serena (Warm/Professional)</option>
                <option value="Marcus (Technical/Direct)">Marcus (Technical/Direct)</option>
                <option value="Charlotte (Conversational)">Charlotte (Conversational/Friendly)</option>
                <option value="David (Assertive/Analytical)">David (Assertive/Analytical)</option>
              </select>
            </div>
          )}

          {/* Question Count stepper */}
          {isActive('voice_screen') && (
            <div className="flex justify-between items-center py-1">
              <div>
                <span className="block text-slate-700 flex items-center gap-1">
                  Voice Screening Questions
                  <span className="group relative inline-block cursor-help">
                    <HelpCircle className="h-3 w-3 text-slate-400" />
                    <span className="invisible group-hover:visible absolute z-50 bg-slate-800 text-white text-[9px] font-bold p-2 rounded-lg -top-8 -left-20 w-44 shadow-lg text-center leading-normal">
                      Total questions the AI voice interviewer asks.
                    </span>
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-bold">Quantity of Voice Queries</span>
              </div>
              <div className="flex items-center gap-2 select-none border border-slate-200 rounded-lg p-1 bg-white">
                <button
                  type="button"
                  onClick={() => setQCount((p: number) => Math.max(3, p - 1))}
                  className="h-6 w-6 rounded bg-slate-50 hover:bg-slate-100 flex items-center justify-center cursor-pointer font-bold"
                >
                  -
                </button>
                <span className="w-5 text-center font-bold text-slate-800">{qCount}</span>
                <button
                  type="button"
                  onClick={() => setQCount((p: number) => Math.min(10, p + 1))}
                  className="h-6 w-6 rounded bg-slate-50 hover:bg-slate-100 flex items-center justify-center cursor-pointer font-bold"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
