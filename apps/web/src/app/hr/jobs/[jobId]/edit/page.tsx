'use client';

import React, { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredJobs, saveStoredJob } from '@/lib/mockData';
import { Sliders, Briefcase, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Autocomplete } from '@/components/ui';
import { SUGGESTED_ROLES } from '@/lib/mockSetupHelpers';
import PipelineConfigCard from '../../new/components/PipelineConfigCard';

export default function HrEditJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const router = useRouter();
  const { jobId } = use(params);

  // Load active job parameters
  const [job, setJob] = useState<any>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const [techWeight, setTechWeight] = useState(25);
  const [commWeight, setCommWeight] = useState(25);
  const [probWeight, setProbWeight] = useState(25);
  const [expWeight, setExpWeight] = useState(25);

  const [minScore, setMinScore] = useState(80);
  const [autoOffer, setAutoOffer] = useState(false);
  const [qCount, setQCount] = useState(5);
  const [enableSourcing, setEnableSourcing] = useState(true);
  const [voiceProfile, setVoiceProfile] = useState('Serena (Warm/Professional)');

  const [stages, setStages] = useState<('screening' | 'assessment' | 'voice_screen' | 'panel' | 'decision')[]>([]);
  const [assessmentConfig, setAssessmentConfig] = useState({
    mcqCount: 5,
    codingProblemId: 'virtualized-list',
    passingScore: 80,
  });

  useEffect(() => {
    const list = getStoredJobs();
    const found = list.find((j) => j.id === jobId) || list[0];
    if (found) {
      setJob(found);
      setTitle(found.title);
      setDescription(found.description);
      setTechWeight(found.rubric.technical);
      setCommWeight(found.rubric.communication);
      setProbWeight(found.rubric.problemSolving || 25);
      setExpWeight(found.rubric.experience || 25);
      setMinScore(found.thresholds.minScore);
      setAutoOffer(found.thresholds.autoOffer || false);
      setStages(found.stages || ['screening', 'assessment', 'voice_screen', 'decision']);
      setAssessmentConfig(found.assessmentConfig || {
        mcqCount: 5,
        codingProblemId: 'virtualized-list',
        passingScore: 80,
      });
    }
  }, [jobId]);

  if (!job) {
    return <div className="text-center p-8 text-xs text-slate-400 font-bold">Loading job configuration...</div>;
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedJob = {
      ...job,
      title,
      description,
      rubric: {
        technical: techWeight,
        communication: commWeight,
        problemSolving: probWeight,
        experience: expWeight,
      },
      thresholds: {
        minScore,
        autoOffer,
      },
      stages,
      assessmentConfig,
    };

    saveStoredJob(updatedJob);
    router.push('/hr/jobs');
  };

  const handleWeightChange = (key: 'tech' | 'comm' | 'prob' | 'exp', val: number) => {
    if (key === 'tech') setTechWeight(val);
    if (key === 'comm') setCommWeight(val);
    if (key === 'prob') setProbWeight(val);
    if (key === 'exp') setExpWeight(val);
  };

  const totalWeight = techWeight + commWeight + probWeight + expWeight;
  const isRubricBalanced = totalWeight === 100;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-1 text-[10px] text-slate-450 font-bold uppercase tracking-wider mb-1">
            <Link href="/hr/jobs" className="hover:text-purple-650 transition-colors">Jobs</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Edit Settings</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Edit Job Opening</h1>
          <p className="text-xs text-slate-505 font-semibold mt-1">
            Modify active pipeline stages, evaluation parameters, and gating thresholds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/hr/jobs"
            className="inline-flex items-center gap-1 bg-white/60 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
            Cancel
          </Link>
          <button
            type="button"
            disabled={!isRubricBalanced}
            onClick={handleUpdate}
            className="rounded-full bg-purple-600 hover:bg-purple-750 text-white font-bold px-5 py-2 text-xs shadow-md transition-all cursor-pointer disabled:opacity-40"
          >
            Update Job Listing
          </button>
        </div>
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
            <div className="flex items-center gap-1.5 text-purple-605 border-b border-slate-100 pb-2">
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
                  onChange={(e) => handleWeightChange('tech', Number(e.target.value))}
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
                  onChange={(e) => handleWeightChange('comm', Number(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5 text-[11px]">
                  <span>Problem Solving</span>
                  <span>{probWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={probWeight}
                  onChange={(e) => handleWeightChange('prob', Number(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5 text-[11px]">
                  <span>Experience</span>
                  <span>{expWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={expWeight}
                  onChange={(e) => handleWeightChange('exp', Number(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              <div className="text-[10px] text-right font-bold text-slate-400">
                Total Weight: <span className={isRubricBalanced ? 'text-emerald-600' : 'text-rose-600'}>{totalWeight}%</span> (must equal 100%)
              </div>
            </div>
          </div>

          {/* Pipeline Configuration Card */}
          <PipelineConfigCard
            minScore={minScore}
            setMinScore={setMinScore}
            autoOffer={autoOffer}
            setAutoOffer={setAutoOffer}
            qCount={qCount}
            setQCount={setQCount}
            enableSourcing={enableSourcing}
            setEnableSourcing={setEnableSourcing}
            voiceProfile={voiceProfile}
            setVoiceProfile={setVoiceProfile}
            stages={stages}
            setStages={setStages}
            assessmentConfig={assessmentConfig}
            setAssessmentConfig={setAssessmentConfig}
          />
        </div>
      </form>
    </div>
  );
}
