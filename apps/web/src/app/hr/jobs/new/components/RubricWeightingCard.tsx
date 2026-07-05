'use client';

import React from 'react';
import { Sliders, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface RubricWeightingCardProps {
  technical: number;
  communication: number;
  problemSolving: number;
  experience: number;
  autoBalance: boolean;
  setAutoBalance: (val: boolean) => void;
  onWeightChange: (key: 'technical' | 'communication' | 'problemSolving' | 'experience', val: number) => void;
}

export default function RubricWeightingCard({
  technical,
  communication,
  problemSolving,
  experience,
  autoBalance,
  setAutoBalance,
  onWeightChange,
}: RubricWeightingCardProps) {
  const total = technical + communication + problemSolving + experience;
  const isBalanced = total === 100;

  return (
    <div className="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5 text-purple-600">
          <Sliders className="h-4.5 w-4.5" />
          <h3 className="text-sm font-bold text-slate-800">Rubric Weighting</h3>
        </div>
        
        {/* Auto Balance Switch */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-bold">Auto-Balance</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoBalance}
              onChange={(e) => setAutoBalance(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </div>

      {/* Breakdown Visualizer */}
      <div className="space-y-2">
        <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-200/50 shadow-inner">
          <div style={{ width: `${(technical / (total || 1)) * 100}%` }} className="bg-indigo-500 transition-all duration-300" title={`Tech: ${technical}%`} />
          <div style={{ width: `${(communication / (total || 1)) * 100}%` }} className="bg-purple-500 transition-all duration-300" title={`Comm: ${communication}%`} />
          <div style={{ width: `${(problemSolving / (total || 1)) * 100}%` }} className="bg-emerald-500 transition-all duration-300" title={`Problem Solving: ${problemSolving}%`} />
          <div style={{ width: `${(experience / (total || 1)) * 100}%` }} className="bg-amber-500 transition-all duration-300" title={`Experience: ${experience}%`} />
        </div>

        {/* Legend / Info */}
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold select-none flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-indigo-500 block" />
            <span>Tech: {technical}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-purple-500 block" />
            <span>Comm: {communication}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 block" />
            <span>Logic: {problemSolving}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500 block" />
            <span>Exp: {experience}%</span>
          </div>
        </div>
      </div>

      {/* Balance Indicator Status */}
      <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-[11px] font-bold ${
        isBalanced 
          ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700' 
          : 'bg-rose-50/50 border-rose-100 text-rose-700'
      }`}>
        {isBalanced ? (
          <>
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
            <span>Rubric Balanced (Exactly 100%)</span>
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-600 animate-bounce" />
            <span>Currently: {total}% (Must be 100% to publish)</span>
          </>
        )}
      </div>

      {/* Sliders list */}
      <div className="space-y-4 pt-1 font-semibold text-slate-600 text-xs">
        {/* Technical */}
        <div>
          <div className="flex justify-between mb-1.5 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 block" />
              Technical Skills
            </span>
            <span className="font-bold text-slate-800">{technical}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={technical}
            onChange={(e) => onWeightChange('technical', Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        {/* Communication */}
        <div>
          <div className="flex justify-between mb-1.5 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 block" />
              Communication
            </span>
            <span className="font-bold text-slate-800">{communication}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={communication}
            onChange={(e) => onWeightChange('communication', Number(e.target.value))}
            className="w-full accent-purple-500 cursor-pointer"
          />
        </div>

        {/* Problem Solving */}
        <div>
          <div className="flex justify-between mb-1.5 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 block" />
              Problem Solving
            </span>
            <span className="font-bold text-slate-800">{problemSolving}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={problemSolving}
            onChange={(e) => onWeightChange('problemSolving', Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>

        {/* Experience Depth */}
        <div>
          <div className="flex justify-between mb-1.5 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 block" />
              Experience Depth
            </span>
            <span className="font-bold text-slate-800">{experience}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={experience}
            onChange={(e) => onWeightChange('experience', Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
