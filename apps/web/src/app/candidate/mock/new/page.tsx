'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mic, ArrowRight, Sparkles, Building2, Briefcase, Star, Trophy, User, Sliders } from 'lucide-react';
import { SUGGESTED_COMPANIES, SUGGESTED_ROLES } from '@/lib/mockSetupHelpers';
import CalibrationPanel from './components/CalibrationPanel';

function MockInterviewSetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [company, setCompany] = useState(searchParams.get('company') || 'Google');
  const [role, setRole] = useState(searchParams.get('role') || 'Software Engineer');
  const [difficulty, setDifficulty] = useState<'junior' | 'mid' | 'senior'>('mid');
  const [loading, setLoading] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Hardware states
  const [micActive, setMicActive] = useState(true);
  const [camActive, setCamActive] = useState(true);
  const [micLevel, setMicLevel] = useState(45);
  const [consent, setConsent] = useState(true);

  useEffect(() => {
    if (!micActive) {
      setMicLevel(0);
      return;
    }
    const interval = setInterval(() => {
      setMicLevel(Math.floor(Math.random() * 35) + 30);
    }, 150);
    return () => clearInterval(interval);
  }, [micActive]);

  useEffect(() => {
    setIsCalibrating(true);
    const t = setTimeout(() => setIsCalibrating(false), 350);
    return () => clearTimeout(t);
  }, [company]);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return;
    setLoading(true);
    setTimeout(() => {
      router.push(`/candidate/mock/mock-session-123?direct=true`);
    }, 1200);
  };

  const difficulties = [
    { key: 'junior', label: 'Junior', sub: '0 - 2 yrs', icon: User },
    { key: 'mid', label: 'Mid Level', sub: '2 - 5 yrs', icon: Star },
    { key: 'senior', label: 'Senior', sub: '5+ yrs', icon: Trophy }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/45 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 uppercase mb-2">
            <Sparkles className="h-3 w-3 text-indigo-650" /> AI Practice Interview
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Setup Practice Interview</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">Choose target settings and check devices before launching the dynamic conversation.</p>
        </div>
      </div>

      <form onSubmit={handleStart} className="space-y-6">
        {/* Step 1: Target Profile */}
        <div className="glass-card p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2"><Building2 className="h-4.5 w-4.5 text-indigo-550" />1. Job Role</h3>
            <p className="text-[11px] text-slate-450 font-semibold mt-0.5">Select the target company and role for the AI conversational topics.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Target Company</label>
              <input type="text" required value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Google, Stripe..." className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white focus:outline-none focus:border-indigo-500 transition-all font-semibold" />
              <div className="flex flex-wrap gap-1">
                {SUGGESTED_COMPANIES.map((c) => (
                  <button key={c} type="button" onClick={() => setCompany(c)} className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-all cursor-pointer ${company.toLowerCase() === c.toLowerCase() ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white/70 text-slate-500 border-slate-200'}`}>{c}</button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Target Job Title</label>
              <input type="text" required value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Software Engineer..." className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white focus:outline-none focus:border-indigo-500 transition-all font-semibold" />
              <div className="flex flex-wrap gap-1">
                {SUGGESTED_ROLES.map((r) => (
                  <button key={r} type="button" onClick={() => setRole(r)} className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-all cursor-pointer ${role.toLowerCase() === r.toLowerCase() ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white/70 text-slate-500 border-slate-200'}`}>{r}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Settings */}
        <div className="glass-card p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2"><Sliders className="h-4.5 w-4.5 text-indigo-555" />2. Vetting Settings</h3>
            <p className="text-[11px] text-slate-455 font-semibold mt-0.5">Define candidate seniority level for standard evaluation routing.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Experience Level</label>
              <div className="grid grid-cols-3 gap-2">
                {difficulties.map((d) => {
                  const Icon = d.icon;
                  const isSelected = difficulty === d.key;
                  return (
                    <button key={d.key} type="button" onClick={() => setDifficulty(d.key as any)} className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${isSelected ? 'border-indigo-500 bg-indigo-500/5 text-indigo-850' : 'border-slate-200 bg-white/40 text-slate-600 hover:bg-white'}`}>
                      <Icon className={`h-4.5 w-4.5 mb-1 ${isSelected ? 'text-indigo-650' : 'text-slate-455'}`} />
                      <span className="text-[11px] font-bold block">{d.label}</span>
                      <span className="text-[8px] font-semibold text-slate-400 block mt-0.5">{d.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic length info panel */}
            <div className="bg-indigo-50/40 border border-indigo-100/50 rounded-2xl p-4 flex gap-3.5 items-start">
              <Sparkles className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <h4 className="text-[11px] font-extrabold text-indigo-950 uppercase tracking-wide">Adaptive AI Vetting Length</h4>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">The interview is voice-led and fully adaptive. The AI dynamically determines the question path and depth based on your replies. Expect 3 to 5 comprehensive conversational turns.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Calibration */}
        <CalibrationPanel company={company} role={role} micActive={micActive} camActive={camActive} micLevel={micLevel} isCalibrating={isCalibrating} onToggleMic={() => setMicActive(!micActive)} onToggleCam={() => setCamActive(!camActive)} />

        {/* Consent & Start */}
        <div className="glass-card p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <label className="flex items-start gap-2.5 cursor-pointer max-w-lg select-none">
            <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 rounded border-slate-300 bg-white text-indigo-600 cursor-pointer" />
            <span className="text-[10px] text-slate-550 leading-relaxed font-bold">I agree to let the system analyze my mic audio and camera eye-gaze during the practice interview.</span>
          </label>
          <button type="submit" disabled={loading || !consent} className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 px-8 text-xs transition-all shadowdisabled:opacity-50 cursor-pointer whitespace-nowrap">
            <Mic className="h-4.5 w-4.5" /> {loading ? 'Starting Interview...' : 'Start Practice Interview'} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default function MockInterviewSetup() {
  return (
    <Suspense fallback={<div className="text-center text-xs text-slate-400 p-8">Loading setup parameters...</div>}>
      <MockInterviewSetupForm />
    </Suspense>
  );
}
