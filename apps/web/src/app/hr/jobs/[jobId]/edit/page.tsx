'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { mockJobs } from '@/lib/mockData';
import { Sliders, Settings, Briefcase } from 'lucide-react';
import { Autocomplete } from '@/components/ui';
import { SUGGESTED_ROLES } from '@/lib/mockSetupHelpers';

export default function HrEditJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const router = useRouter();
  const { jobId } = use(params);

  const job = mockJobs.find((j) => j.id === jobId) || mockJobs[0];

  const [title, setTitle] = useState(job.title);
  const [description, setDescription] = useState(job.description);
  const [techWeight, setTechWeight] = useState(job.rubric.technical);
  const [commWeight, setCommWeight] = useState(job.rubric.communication);
  
  const [minScore, setMinScore] = useState(job.thresholds.minScore);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/hr/jobs');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Edit Job Listing</h1>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Modify active parameters and scoring weight distributions.
        </p>
      </div>

      <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Position Title</label>
              <Autocomplete
                required
                options={SUGGESTED_ROLES}
                value={title}
                onChange={(val) => setTitle(val)}
                icon={<Briefcase className="h-4 w-4" />}
                className="text-xs font-semibold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
              <textarea
                required
                rows={8}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 bg-white/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all glass-input"
              />
            </div>
          </div>
        </div>

        {/* Configurations Column */}
        <div className="space-y-6">
          {/* Rubric Weights */}
          <div className="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
            <div className="flex items-center gap-1.5 text-purple-600 border-b border-slate-100 pb-2">
              <Sliders className="h-4.5 w-4.5" />
              <h3 className="text-xs font-bold text-slate-800 font-sans">Rubric Weighting</h3>
            </div>
            
            <div className="space-y-4 text-xs font-semibold text-slate-600">
              <div>
                <div className="flex justify-between mb-1.5 text-[11px]">
                  <span>Technical Skills</span>
                  <span>{techWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={techWeight}
                  onChange={(e) => setTechWeight(Number(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5 text-[11px]">
                  <span>Communication</span>
                  <span>{commWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={commWeight}
                  onChange={(e) => setCommWeight(Number(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Thresholds */}
          <div className="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
            <div className="flex items-center gap-1.5 text-purple-600 border-b border-slate-100 pb-2">
              <Settings className="h-4.5 w-4.5" />
              <h3 className="text-xs font-bold text-slate-800 font-sans">Threshold Gate</h3>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-600">
              <div>
                <div className="flex justify-between mb-1.5 text-[11px]">
                  <span>Min Passing Score</span>
                  <span>{minScore}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 text-xs shadow-md transition-all cursor-pointer"
            >
              Update Job Rubrics
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
