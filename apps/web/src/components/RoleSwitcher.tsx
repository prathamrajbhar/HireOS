'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sparkles, Users, User, ChevronUp, ChevronDown } from 'lucide-react';

export default function RoleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const roles = [
    { name: 'Public Portal', path: '/', icon: Sparkles, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { name: 'Candidate Portal', path: '/candidate/dashboard', icon: User, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { name: 'HR Portal', path: '/hr/dashboard', icon: Users, color: 'text-purple-600 bg-purple-50 border-purple-100' },
  ];

  const candidatePages = [
    { name: 'Dashboard', path: '/candidate/dashboard' },
    { name: 'Browse Jobs', path: '/jobs' },
    { name: 'Applications', path: '/candidate/applications' },
    { name: 'Profile', path: '/candidate/profile' },
    { name: 'Mock Interview (Setup)', path: '/candidate/mock/new' },
    { name: 'Mock Interview (Session)', path: '/candidate/mock/mock-session-123' },
    { name: 'Mock Interview (Feedback)', path: '/candidate/mock/mock-session-123/feedback' },
    { name: 'Mock History', path: '/candidate/mock/history' },
  ];

  const hrPages = [
    { name: 'Dashboard', path: '/hr/dashboard' },
    { name: 'Jobs List', path: '/hr/jobs' },
    { name: 'Create Job', path: '/hr/jobs/new' },
    { name: 'Job Pipeline (Kanban)', path: '/hr/jobs/job-101/pipeline' },
    { name: 'Candidate List', path: '/hr/jobs/job-101/candidates' },
    { name: 'Candidate Evaluation', path: '/hr/candidates/app-501' },
    { name: 'Interview Replay', path: '/hr/candidates/app-501/interview' },
    { name: 'Analytics', path: '/hr/analytics' },
    { name: 'Settings', path: '/hr/settings' },
  ];

  const authPages = [
    { name: 'Login', path: '/login' },
    { name: 'Sign Up', path: '/signup' },
    { name: 'Forgot Password', path: '/forgot-password' },
    { name: 'Candidate Onboarding', path: '/onboarding/candidate' },
    { name: 'Company Onboarding', path: '/onboarding/company' },
  ];

  const publicPages = [
    { name: 'Landing Page', path: '/' },
    { name: 'About Us', path: '/about' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'Job Board', path: '/jobs' },
    { name: 'Job Detail', path: '/jobs/job-101' },
  ];

  const handleNavigate = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-white border border-slate-200 mb-3 w-80 max-h-[75vh] overflow-y-auto p-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-bold text-slate-800 text-sm">Quick Jump Menu</span>
            <span className="text-xs text-slate-400">Prototype Navigation</span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Main Surfaces</span>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                {roles.map((r) => {
                  const Icon = r.icon;
                  const isActive = pathname === r.path;
                  return (
                    <button
                      key={r.name}
                      onClick={() => handleNavigate(r.path)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all hover:scale-[1.02] cursor-pointer ${
                        isActive 
                          ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 shadow-sm'
                          : 'border-slate-100 bg-slate-50/30 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5 mb-1" />
                      <span className="text-[10px] font-semibold">{r.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Candidate Flow</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {candidatePages.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => handleNavigate(p.path)}
                    className={`text-[10px] px-2 py-1 rounded-md border cursor-pointer ${
                      pathname === p.path
                        ? 'bg-emerald-500 text-white border-emerald-600'
                        : 'bg-white/60 text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">HR / Recruiter Flow</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {hrPages.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => handleNavigate(p.path)}
                    className={`text-[10px] px-2 py-1 rounded-md border cursor-pointer ${
                      pathname === p.path
                        ? 'bg-purple-500 text-white border-purple-600'
                        : 'bg-white/60 text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Auth & Setup</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {authPages.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => handleNavigate(p.path)}
                    className={`text-[10px] px-2 py-1 rounded-md border cursor-pointer ${
                      pathname === p.path
                        ? 'bg-slate-700 text-white border-slate-800'
                        : 'bg-white/60 text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Public Pages</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {publicPages.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => handleNavigate(p.path)}
                    className={`text-[10px] px-2 py-1 rounded-md border cursor-pointer ${
                      pathname === p.path
                        ? 'bg-indigo-500 text-white border-indigo-600'
                        : 'bg-white/60 text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-xl hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all cursor-pointer text-xs uppercase tracking-wider"
      >
        <Sparkles className="h-4 w-4" />
        <span>Prototype Menu</span>
        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
