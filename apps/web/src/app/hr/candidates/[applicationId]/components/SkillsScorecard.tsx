'use client';

import React from 'react';
import { Award } from 'lucide-react';

interface SkillsScorecardProps {
  scores?: {
    technical: number;
    communication: number;
    problemSolving: number;
    experience: number;
  };
}

export default function SkillsScorecard({ scores }: SkillsScorecardProps) {
  if (!scores) return null;

  return (
    <div className="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
      <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
        <Award className="h-4.5 w-4.5 text-indigo-500" />
        Skills Scorecard
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { name: 'Technical Knowledge', val: scores.technical },
          { name: 'Communication Logic', val: scores.communication },
          { name: 'Problem Solving', val: scores.problemSolving },
          { name: 'Experience Match', val: scores.experience },
        ].map((s) => (
          <div key={s.name} className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>{s.name}</span>
              <span>{s.val}%</span>
            </div>
            <div className="w-full bg-slate-200/50 rounded-full h-1.5">
              <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${s.val}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
