'use client';

import React, { useState } from 'react';
import { Sparkles, Cpu, Plus, X, Award, ShieldAlert, Heart } from 'lucide-react';

interface AiExtractProps {
  assisted: boolean;
  assisting: boolean;
  assistStep: string;
  skills: string[];
  setSkills: React.Dispatch<React.SetStateAction<string[]>>;
  softSkills: string[];
  setSoftSkills: React.Dispatch<React.SetStateAction<string[]>>;
  cultureKeywords: string[];
  setCultureKeywords: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function AiExtractPanel({
  assisted,
  assisting,
  assistStep,
  skills,
  setSkills,
  softSkills,
  setSoftSkills,
  cultureKeywords,
  setCultureKeywords,
}: AiExtractProps) {
  const [newSkill, setNewSkill] = useState('');
  const [newSoftSkill, setNewSoftSkill] = useState('');
  const [newCulture, setNewCulture] = useState('');

  const addChip = (
    value: string,
    setValue: (val: string) => void,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    currentList: string[]
  ) => {
    const trimmed = value.trim();
    if (trimmed && !currentList.includes(trimmed)) {
      setter((prev) => [...prev, trimmed]);
      setValue('');
    }
  };

  const removeChip = (
    item: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((prev) => prev.filter((i) => i !== item));
  };

  if (assisting) {
    return (
      <div className="rounded-3xl border border-indigo-200/80 bg-indigo-50/20 p-6 shadow-sm backdrop-blur-md space-y-4 animate-pulse">
        <div className="flex items-center gap-2 text-indigo-600">
          <Cpu className="h-5 w-5 animate-spin" />
          <h3 className="text-xs font-bold uppercase tracking-wider">AI Coprocessor Active</h3>
        </div>
        <div className="space-y-2">
          <div className="h-2 w-full bg-indigo-100 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 bg-indigo-500 rounded-full animate-infinite animate-duration-1000" style={{ width: '40%' }} />
          </div>
          <p className="text-[10px] text-indigo-600 font-bold tracking-tight italic select-none">
            {assistStep}
          </p>
        </div>
      </div>
    );
  }

  if (!assisted) return null;

  return (
    <div className="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-md glass-panel space-y-6 animate-in slide-in-from-bottom-3 duration-250">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2 text-indigo-650">
          <Sparkles className="h-4.5 w-4.5" />
          <h3 className="text-xs font-bold text-slate-800">AI-Extracted Evaluation Parameters</h3>
        </div>
        <span className="text-[9px] font-bold uppercase bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">
          Parameters Ready
        </span>
      </div>

      <div className="space-y-4 text-xs font-semibold">
        {/* Technical Skills */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
            <Award className="h-3 w-3 text-indigo-500" />
            Required Tech Skills
          </span>
          <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white/30 border border-slate-100 min-h-[44px] items-center">
            {skills.map((item) => (
              <span
                key={item}
                className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 group transition-all"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeChip(item, setSkills)}
                  className="opacity-60 hover:opacity-100 text-indigo-900 cursor-pointer"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1 max-w-[120px] ml-1">
              <input
                type="text"
                placeholder="Add Tech Skill"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addChip(newSkill, setNewSkill, setSkills, skills);
                  }
                }}
                className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none text-[10px] py-0.5 font-bold transition-all"
              />
              <button
                type="button"
                onClick={() => addChip(newSkill, setNewSkill, setSkills, skills)}
                className="p-0.5 hover:bg-slate-100 rounded cursor-pointer"
              >
                <Plus className="h-3 w-3 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Soft Skills */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
            <ShieldAlert className="h-3 w-3 text-purple-500" />
            Evaluated Soft Skills
          </span>
          <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white/30 border border-slate-100 min-h-[44px] items-center">
            {softSkills.map((item) => (
              <span
                key={item}
                className="bg-purple-50 border border-purple-100 text-purple-700 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 group transition-all"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeChip(item, setSoftSkills)}
                  className="opacity-60 hover:opacity-100 text-purple-900 cursor-pointer"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1 max-w-[120px] ml-1">
              <input
                type="text"
                placeholder="Add Soft Skill"
                value={newSoftSkill}
                onChange={(e) => setNewSoftSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addChip(newSoftSkill, setNewSoftSkill, setSoftSkills, softSkills);
                  }
                }}
                className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none text-[10px] py-0.5 font-bold transition-all"
              />
              <button
                type="button"
                onClick={() => addChip(newSoftSkill, setNewSoftSkill, setSoftSkills, softSkills)}
                className="p-0.5 hover:bg-slate-100 rounded cursor-pointer"
              >
                <Plus className="h-3 w-3 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Culture Keywords */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
            <Heart className="h-3 w-3 text-rose-500" />
            Culture & Team Alignment
          </span>
          <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white/30 border border-slate-100 min-h-[44px] items-center">
            {cultureKeywords.map((item) => (
              <span
                key={item}
                className="bg-rose-50 border border-rose-100 text-rose-700 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 group transition-all"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeChip(item, setCultureKeywords)}
                  className="opacity-60 hover:opacity-100 text-rose-900 cursor-pointer"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1 max-w-[120px] ml-1">
              <input
                type="text"
                placeholder="Add Culture Tag"
                value={newCulture}
                onChange={(e) => setNewCulture(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addChip(newCulture, setNewCulture, setCultureKeywords, cultureKeywords);
                  }
                }}
                className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-rose-500 focus:outline-none text-[10px] py-0.5 font-bold transition-all"
              />
              <button
                type="button"
                onClick={() => addChip(newCulture, setNewCulture, setCultureKeywords, cultureKeywords)}
                className="p-0.5 hover:bg-slate-100 rounded cursor-pointer"
              >
                <Plus className="h-3 w-3 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
