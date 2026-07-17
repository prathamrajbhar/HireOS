'use client';

import React from 'react';
import { Activity, Building2, VideoOff, Mic, MicOff, Video } from 'lucide-react';
import { getCompanyCultureNotes, getRubricWeights } from '@/lib/mockSetupHelpers';

interface CalibrationPanelProps {
  company: string;
  role: string;
  micActive: boolean;
  camActive: boolean;
  micLevel: number;
  isCalibrating: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
}

export default function CalibrationPanel({
  company,
  role,
  micActive,
  camActive,
  micLevel,
  isCalibrating,
  onToggleMic,
  onToggleCam,
}: CalibrationPanelProps) {
  const companyCulture = getCompanyCultureNotes(company);
  const weights = getRubricWeights(role);

  return (
    <div className="glass-card p-6 sm:p-8 space-y-6">
      <div>
        <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Activity className="h-4.5 w-4.5 text-indigo-555" />
          2. Calibration & Device Setup
        </h3>
        <p className="text-[11px] text-slate-455 font-semibold mt-0.5">
          Check the evaluation criteria weights and verify your mic and camera work properly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Evaluation Weights */}
        <div className="space-y-4 relative">
          {isCalibrating && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2">
              <Activity className="h-4.5 w-4.5 text-indigo-600 animate-spin" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Loading Weights...</span>
            </div>
          )}

          <div className="flex gap-4 items-center mb-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-slate-200/80 p-1 shadow-sm overflow-hidden flex-shrink-0">
              <Building2 className="h-5 w-5 text-slate-400" />
            </span>
            <div className="text-left">
              <h4 className="text-[10px] font-extrabold text-slate-800 tracking-tight uppercase">Evaluation Weights</h4>
              <span className="text-[10px] font-semibold text-indigo-600 block">{company || 'General Standard'}</span>
            </div>
          </div>

          <div className="bg-slate-50/40 border border-white/60 rounded-xl p-3 text-[11px] font-semibold leading-relaxed text-slate-555 shadow-inner">
            {companyCulture.notes}
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-700 mb-1">
                <span>Technical Skills</span>
                <span className="text-indigo-650 font-extrabold">{weights.technical}%</span>
              </div>
              <div className="w-full bg-white/45 border border-white/20 rounded-full h-0.5 p-0.5">
                <div className="bg-indigo-500 h-0.5 rounded-full transition-all duration-300" style={{ width: `${weights.technical}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-700 mb-1">
                <span>Communication Skills</span>
                <span className="text-indigo-650 font-extrabold">{weights.communication}%</span>
              </div>
              <div className="w-full bg-white/45 border border-white/20 rounded-full h-0.5 p-0.5">
                <div className="bg-indigo-500 h-0.5 rounded-full transition-all duration-300" style={{ width: `${weights.communication}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Device Console */}
        <div className="space-y-4 bg-slate-50/30 border border-white/60 p-4 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block border-b border-white/45 pb-2">
            Device Test
          </span>

          <div className="relative h-28 bg-slate-100 rounded-xl border border-slate-200/80 overflow-hidden flex items-center justify-center shadow-inner">
            {camActive ? (
              <div className="w-full h-full bg-slate-200/40 flex items-center justify-center font-bold text-slate-500 relative">
                <span className="text-[9px] uppercase tracking-wider">Webcam Simulator Active</span>
                <span className="absolute bottom-2 left-2 text-[8px] bg-white/95 px-2 py-0.5 rounded font-mono text-emerald-700 border border-emerald-100 shadow-sm flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></span>
                  Eye Tracking Active
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 font-semibold text-slate-400">
                <VideoOff className="h-5 w-5 text-slate-350" />
                <span className="text-[9px] uppercase">Camera Disabled</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Microphone Test</span>
              <span className={micActive ? 'text-indigo-650' : 'text-slate-400'}>
                {micActive ? 'Optimal' : 'Muted'}
              </span>
            </div>
            <div className="w-full bg-slate-200/50 rounded-full h-2 shadow-inner p-0.5 border border-slate-200/30">
              <div className="bg-emerald-500 h-1 rounded-full transition-all duration-100" style={{ width: `${micLevel}%` }} />
            </div>
          </div>

          <div className="flex justify-around items-center pt-2">
            <button
              type="button"
              onClick={onToggleMic}
              className={`p-2 rounded-xl border cursor-pointer transition-all ${micActive ? 'bg-white border-slate-200 text-slate-655' : 'bg-rose-50 border-rose-100 text-rose-600'}`}
            >
              {micActive ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onToggleCam}
              className={`p-2 rounded-xl border cursor-pointer transition-all ${camActive ? 'bg-white border-slate-200 text-slate-655' : 'bg-rose-50 border-rose-100 text-rose-600'}`}
            >
              {camActive ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
