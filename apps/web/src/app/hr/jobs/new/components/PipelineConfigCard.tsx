'use client';

import React from 'react';
import { Settings, HelpCircle, AudioLines, Users } from 'lucide-react';

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
}: PipelineConfigCardProps) {
  return (
    <div className="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
      <div className="flex items-center gap-1.5 text-indigo-600 border-b border-slate-100 pb-2">
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
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
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
            <span className="font-bold text-slate-800">{minScore}%</span>
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
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Voice Profile select */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 block mb-1 flex items-center gap-1">
            <AudioLines className="h-3.5 w-3.5 text-indigo-500" />
            Interviewer Agent Voice
          </label>
          <select
            value={voiceProfile}
            onChange={(e) => setVoiceProfile(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 bg-white/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all glass-input"
          >
            <option value="Serena (Warm/Professional)">Serena (Warm/Professional)</option>
            <option value="Marcus (Technical/Direct)">Marcus (Technical/Direct)</option>
            <option value="Charlotte (Conversational)">Charlotte (Conversational/Friendly)</option>
            <option value="David (Assertive/Analytical)">David (Assertive/Analytical)</option>
          </select>
        </div>

        {/* Question Count stepper */}
        <div className="flex justify-between items-center py-1">
          <div>
            <span className="block text-slate-700 flex items-center gap-1">
              Screening Questions
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
            <span className="w-5 text-center font-bold">{qCount}</span>
            <button
              type="button"
              onClick={() => setQCount((p: number) => Math.min(10, p + 1))}
              className="h-6 w-6 rounded bg-slate-50 hover:bg-slate-100 flex items-center justify-center cursor-pointer font-bold"
            >
              +
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
