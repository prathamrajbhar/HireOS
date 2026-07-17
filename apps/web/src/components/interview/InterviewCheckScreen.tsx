'use client';

import React, { useState } from 'react';
import { Play } from 'lucide-react';

interface InterviewCheckScreenProps {
  company: string;
  role: string;
  camActive: boolean;
  onJoin: () => void;
}

export default function InterviewCheckScreen({
  company,
  role,
  camActive,
  onJoin,
}: InterviewCheckScreenProps) {
  const [consent, setConsent] = useState(true);

  return (
    <div className="glass-card max-w-md p-8 space-y-6 text-center animate-in fade-in duration-300 w-full mx-auto">
      <div className="h-16 w-16 items-center justify-center rounded-2xl bg-white border border-slate-200/80 p-2 shadow-sm overflow-hidden mx-auto flex flex-shrink-0">
        <span className="text-xs font-black text-indigo-650 tracking-wider">HireOS</span>
      </div>
      <div>
        <h2 className="text-xl font-black text-slate-900">Hardware & Consent Check</h2>
        <p className="text-xs text-slate-500 leading-relaxed mt-1 font-semibold">
          Calibrating assessment portal for <span className="text-indigo-650 font-bold">{company}</span> ({role}).
        </p>
      </div>

      <div className="relative h-44 bg-slate-100 rounded-2xl border border-slate-200/85 overflow-hidden flex items-center justify-center text-slate-400 text-xs shadow-inner">
        {camActive ? (
          <div className="w-full h-full bg-slate-250/20 flex items-center justify-center font-bold text-slate-600">
            Webcam Active (Simulator)
          </div>
        ) : (
          <span className="font-semibold text-slate-450">Camera Deactivated</span>
        )}
      </div>

      <div className="text-left space-y-2 border-t border-slate-100 pt-4">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 rounded border-slate-350 bg-white text-emerald-600 focus:ring-0 cursor-pointer"
          />
          <span className="text-[10px] text-slate-500 leading-relaxed font-bold">
            I consent to sharing video proctoring flags (MediaPipe gaze track detection) with the evaluator.
          </span>
        </label>
      </div>

      <button
        onClick={onJoin}
        disabled={!consent}
        className="w-full flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 py-3 font-extrabold text-white shadow-md shadow-emerald-100 hover:shadow-lg hover:shadow-emerald-500/20 transition-all cursor-pointer text-xs uppercase disabled:opacity-50 hover:scale-[1.01]"
      >
        <Play className="h-4 w-4" />
        Join Vetting Room
      </button>
    </div>
  );
}
