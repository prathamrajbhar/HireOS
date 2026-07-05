'use client';

import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface DecisionControlProps {
  appId: string;
  initialDecision: 'hire' | 'reject' | 'hold';
  initialReasoning: string;
  showApprovalButtons: boolean;
}

export default function DecisionControl({
  appId,
  initialDecision,
  initialReasoning,
  showApprovalButtons,
}: DecisionControlProps) {
  const [decision, setDecision] = useState(initialDecision);
  const [reasoning, setReasoning] = useState(initialReasoning);
  const [saved, setSaved] = useState(false);

  const handleSaveDecision = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
      <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
        <ShieldCheck className="h-4.5 w-4.5 text-purple-600" />
        Decision Control
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Outcome Picker</label>
          <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-200/50 border border-slate-200 text-[10px] font-bold">
            {(['hire', 'reject', 'hold'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setDecision(item)}
                className={`py-2 rounded-lg cursor-pointer capitalize ${
                  decision === item
                    ? item === 'hire' ? 'bg-emerald-600 text-white shadow'
                    : item === 'reject' ? 'bg-rose-600 text-white shadow'
                    : 'bg-slate-700 text-white shadow'
                    : 'text-slate-655'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Decision Reasoning</label>
          <textarea
            rows={4}
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-250 bg-white/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
            placeholder="Record justification overrides..."
          />
        </div>

        <button
          type="button"
          onClick={handleSaveDecision}
          className="w-full rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-xs shadow-sm transition-all cursor-pointer"
        >
          Save Decision parameters
        </button>

        {showApprovalButtons && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={() => alert(`POST /evaluations/${appId}/decision/approve successful`)}
              className="w-full rounded-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 text-xs shadow transition-all cursor-pointer"
            >
              Approve Offer
            </button>
            <button
              type="button"
              onClick={() => alert(`Decision overridden for application ${appId}`)}
              className="w-full rounded-full bg-white hover:bg-slate-50 text-slate-750 border border-slate-200 font-bold py-2.5 text-xs shadow-sm transition-all cursor-pointer glass-panel"
            >
              Override Decision
            </button>
          </div>
        )}

        {saved && (
          <div className="text-center text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded p-1.5 animate-pulse">
            Parameters saved successfully.
          </div>
        )}
      </div>
    </div>
  );
}
