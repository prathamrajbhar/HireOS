'use client';

import React, { useState } from 'react';
import { Sliders, X, Settings, Check } from 'lucide-react';

interface EditThresholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  minScore: number;
  setMinScore: (val: number) => void;
  autoOffer: boolean;
  setAutoOffer: (val: boolean) => void;
}

export default function EditThresholdModal({
  isOpen,
  onClose,
  minScore,
  setMinScore,
  autoOffer,
  setAutoOffer,
}: EditThresholdModalProps) {
  const [localMinScore, setLocalMinScore] = useState(minScore);
  const [localAutoOffer, setLocalAutoOffer] = useState(autoOffer);

  if (!isOpen) return null;

  const handleApply = () => {
    setMinScore(localMinScore);
    setAutoOffer(localAutoOffer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-slate-100 border border-slate-200 shadow-2xl rounded-3xl p-6 relative animate-in zoom-in-95 duration-200 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1.5 text-purple-650">
            <Sliders className="h-4.5 w-4.5" />
            <span className="text-sm font-black text-slate-800">Configure Gating Thresholds</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs font-semibold text-slate-650">
          {/* Min Shortlist Score */}
          <div>
            <div className="flex justify-between mb-1.5 text-[11px]">
              <span className="text-slate-700">Minimum Shortlist Score</span>
              <span className="font-extrabold text-purple-600">{localMinScore}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              value={localMinScore}
              onChange={(e) => setLocalMinScore(Number(e.target.value))}
              className="w-full accent-purple-600 cursor-pointer"
            />
            <span className="text-[10px] text-slate-450 block mt-1 leading-normal font-bold">
              Candidates who grade below this score during the voice screening are automatically rejected.
            </span>
          </div>

          {/* Auto Offer Trigger */}
          <div className="flex justify-between items-center py-2 border-t border-slate-200/50">
            <div>
              <span className="block text-slate-700">Auto-Offer Trigger</span>
              <span className="text-[10px] text-slate-450 block mt-0.5 leading-normal font-bold">
                Automatically dispatch contracts if scoring details exceed the thresholds.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localAutoOffer}
                onChange={(e) => setLocalAutoOffer(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-3 border-t border-slate-200/50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-white border border-slate-250 text-slate-600 hover:text-slate-800 hover:bg-slate-50 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 bg-purple-600 hover:bg-purple-750 text-white font-bold py-2 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            <Check className="h-4 w-4" />
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
