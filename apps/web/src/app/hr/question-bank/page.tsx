'use client';

import React, { useState } from 'react';
import { Brain } from '@/lib/lucide-google-icons';

export default function HrQuestionBankPage() {
  const [selectedRole, setSelectedRole] = useState<'frontend' | 'backend' | 'product'>('frontend');
  
  // Dynamic AI Generator states
  const [topic, setTopic] = useState('System Design');
  const [difficulty, setDifficulty] = useState('senior');
  const [generating, setGenerating] = useState(false);
  const [generatedQ, setGeneratedQ] = useState<{
    question: string;
    tip: string;
    rubric: string;
  } | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setGeneratedQ(null);

    setTimeout(() => {
      setGenerating(false);
      setGeneratedQ({
        question: `How would you design a distributed rate limiter that handles 100k requests/second across multiple geographical regions with low latency?`,
        tip: `Evaluate technical depth regarding token buckets vs leaky buckets, caching consistency (Redis clusters), and synchronization drift.`,
        rubric: `Assess technical breadth (50%), fault-tolerance planning (30%), and communication clarity (20%).`,
      });
    }, 1500);
  };

  const handleAddToBank = () => {
    setSuccessMsg('Successfully added generated question to Swiggy screening template!');
    setTimeout(() => {
      setSuccessMsg('');
      setGeneratedQ(null);
    }, 2500);
  };

  // Static templates breakdown for display
  const templates = {
    frontend: {
      name: 'Frontend Architect Template',
      weights: { technical: '40%', communication: '30%', product: '30%' },
      questions: [
        { q: 'Explain how you would optimize list rendering for a food delivery menu containing thousands of nested items.', cat: 'Technical', diff: 'Hard' },
        { q: 'Describe how you would debug a layout shift (CLS) bottleneck on the checkout page.', cat: 'Problem Solving', diff: 'Medium' },
        { q: 'How do you prioritize web performance work against feature delivery deadlines?', cat: 'Communication', diff: 'Medium' }
      ]
    },
    backend: {
      name: 'Distributed Systems Template',
      weights: { technical: '50%', communication: '20%', architecture: '30%' },
      questions: [
        { q: 'Walk us through how you would handle write-heavy concurrent transactions under seasonal traffic spikes.', cat: 'Technical', diff: 'Hard' },
        { q: 'Explain the trade-offs of using WebSockets vs Long Polling for real-time order tracking updates.', cat: 'Architecture', diff: 'Medium' },
        { q: 'How would you debug a deadlocked database state in a production microservice?', cat: 'Problem Solving', diff: 'Hard' }
      ]
    },
    product: {
      name: 'Product Manager Core Template',
      weights: { productSense: '40%', execution: '45%', culture: '15%' },
      questions: [
        { q: 'Walk us through how you would decide whether to launch a subscription tier vs transaction-fee model for grocery deliveries.', cat: 'Strategy', diff: 'Hard' },
        { q: 'Describe how you define success metrics for an AI-based search recommendation module.', cat: 'Analytics', diff: 'Medium' },
        { q: 'How do you handle disagreements between technical lead estimations and marketing deadlines?', cat: 'Leadership', diff: 'Medium' }
      ]
    }
  };

  const currentTemplate = templates[selectedRole];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Console Top branding */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-5">
        <div>
          <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest block mb-1">
            Recruiter Console
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Question Bank &amp; Templates</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
            Build and adjust screening templates, target rubrics weightings, and seed AI evaluation criteria.
          </p>
        </div>
      </div>

      {/* Main Grid: Template lists & AI Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Templates and Questions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/45 dark:bg-slate-900/60 p-6 sm:p-8 shadow-md backdrop-blur-md glass-panel space-y-6">
            
            {/* Role select tabs */}
            <div className="flex gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-3">
              {(['frontend', 'backend', 'product'] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    selectedRole === role
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white/70 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-700'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            {/* Weights and items */}
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Assessment Focus Weights</span>
                <div className="flex gap-4 text-xs font-black text-slate-800 dark:text-slate-100 uppercase">
                  {Object.entries(currentTemplate.weights).map(([key, val]) => (
                    <span key={key}>{key}: {val}</span>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Calibrated Evaluation Prompts</h4>
                <div className="space-y-2">
                  {currentTemplate.questions.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white/35 dark:bg-slate-800/40 flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-relaxed">{item.q}</p>
                        <div className="flex gap-2 text-[9px] font-bold text-slate-400 dark:text-slate-400">
                          <span className="uppercase text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.2 rounded border border-purple-100 dark:border-purple-900/60">{item.cat}</span>
                          <span>Difficulty: {item.diff}</span>
                        </div>
                      </div>
                      <button className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer">
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Question Generator */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/45 dark:bg-slate-900/60 p-6 shadow-md backdrop-blur-md glass-panel space-y-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200/60 dark:border-slate-800 pb-2.5 flex items-center gap-1.5">
              <Brain className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400 animate-pulse" />
              AI Question Generator
            </h3>

            <form onSubmit={handleGenerate} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Topic / Domain</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. System Design, React"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-purple-500 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-purple-500 font-semibold cursor-pointer"
                >
                  <option value="junior" className="dark:bg-slate-900 dark:text-slate-200">Junior (0-2 yrs)</option>
                  <option value="mid" className="dark:bg-slate-900 dark:text-slate-200">Mid Level (2-5 yrs)</option>
                  <option value="senior" className="dark:bg-slate-900 dark:text-slate-200">Senior (5+ yrs)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold py-3 text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Brain className="h-4 w-4" /> {generating ? 'Generating Prompt...' : 'Generate AI Question'}
              </button>
            </form>

            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 rounded-2xl text-[10px] font-bold text-emerald-800 dark:text-emerald-300 text-center">
                {successMsg}
              </div>
            )}

            {generatedQ && (
              // Generated preview card
              <div className="p-4 rounded-2xl border border-purple-100 dark:border-purple-900/60 bg-purple-50/20 dark:bg-purple-950/30 space-y-3 animate-in fade-in duration-200">
                <h4 className="text-[11px] font-black text-purple-900 dark:text-purple-200 uppercase tracking-wide">Generated Question Draft</h4>
                <p className="text-xs text-slate-800 dark:text-slate-100 leading-relaxed font-bold">{generatedQ.question}</p>
                
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold space-y-1.5 border-t border-purple-100/50 dark:border-purple-900/40 pt-2.5">
                  <p><strong className="text-slate-700 dark:text-slate-200 font-bold block">Evaluation rubric:</strong> {generatedQ.rubric}</p>
                  <p className="italic"><strong className="text-slate-750 dark:text-slate-200 font-bold block mt-1">Interviewer hint:</strong> {generatedQ.tip}</p>
                </div>

                <button
                  onClick={handleAddToBank}
                  className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 text-xs shadow-sm cursor-pointer mt-1 text-center"
                >
                  Add to Active Templates
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
