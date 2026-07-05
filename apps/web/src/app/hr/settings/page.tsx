'use client';

import React, { useState } from 'react';
import { Settings, Users, Calendar, Mail, Check, Plus } from 'lucide-react';

export default function HrSettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'team' | 'integrations' | 'emails'>('general');

  // Team list
  const [team, setTeam] = useState([
    { name: 'John Recruiter', email: 'john@agency.co', role: 'Admin' },
    { name: 'Alice Smith', email: 'alice@agency.co', role: 'Reviewer' }
  ]);
  const [emailInput, setEmailInput] = useState('');

  // Email Templates
  const [outreachTemplate, setOutreachTemplate] = useState('Hi {{candidate_name}},\n\nOur Screening Agent processed your resume and matched you for the {{role_title}} role. Please select a time slot to talk to our Interviewer Agent.');

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setTeam([...team, { name: emailInput.split('@')[0], email: emailInput.trim(), role: 'Reviewer' }]);
      setEmailInput('');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Organization Settings</h1>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Configure workspaces, team credentials, scheduler calendars, and email parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Navigation tabs */}
        <div className="rounded-3xl border border-white/60 bg-white/40 p-4 shadow-sm backdrop-blur-md glass-panel flex flex-col gap-1 select-none">
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full text-left px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'general' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100/50'
            }`}
          >
            <Settings className="h-4 w-4" />
            General Settings
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`w-full text-left px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'team' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100/50'
            }`}
          >
            <Users className="h-4 w-4" />
            Team Members
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`w-full text-left px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'integrations' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100/50'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Integrations
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`w-full text-left px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'emails' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100/50'
            }`}
          >
            <Mail className="h-4 w-4" />
            Email Templates
          </button>
        </div>

        {/* Content Panel */}
        <div className="lg:col-span-3 rounded-3xl border border-white/60 bg-white/40 p-6 md:p-8 shadow-sm backdrop-blur-md glass-panel">
          
          {activeTab === 'general' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Workspace Configuration</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Organization Name</label>
                  <input
                    type="text"
                    defaultValue="Vercel Workspace"
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200/80 bg-white/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all glass-input"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Billing Tier</label>
                  <span className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200/80 bg-slate-50 text-slate-500 block font-bold">
                    Free Hackathon Tier
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Recruiting Partners</h3>
              
              <div className="space-y-3">
                {team.map((member, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-white/50 text-xs font-semibold text-slate-700">
                    <div>
                      <span className="block font-bold text-slate-800">{member.name}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{member.email}</span>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full uppercase">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddMember} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="co-recruiter@company.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="flex-grow px-3 py-2 text-xs rounded-xl border border-slate-200/80 bg-white/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all glass-input"
                />
                <button type="submit" className="rounded-xl bg-slate-900 text-white font-bold text-xs px-4 hover:bg-slate-800 flex items-center gap-1 cursor-pointer">
                  <Plus className="h-4 w-4" />
                  Invite
                </button>
              </form>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Connect Integrations</h3>
              
              <div className="space-y-4">
                {/* Google Calendar */}
                <div className="flex justify-between items-center p-4 rounded-2xl border border-slate-150 bg-white/50">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📅</span>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Google Calendar Sync</span>
                      <span className="text-[10px] text-slate-400 font-semibold block">Required for AI scheduling</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      <Check className="h-3 w-3" />
                      Connected
                    </span>
                    <button
                      type="button"
                      onClick={() => alert('Calendar reconnected')}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-850 hover:underline cursor-pointer"
                    >
                      Reconnect
                    </button>
                  </div>
                </div>

                {/* Gmail / SMTP */}
                <div className="flex justify-between items-center p-4 rounded-2xl border border-slate-150 bg-white/50">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📧</span>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Gmail & SMTP Server</span>
                      <span className="text-[10px] text-slate-400 font-semibold block">Required for dispatching decision letters</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      <Check className="h-3 w-3" />
                      Connected
                    </span>
                    <button
                      type="button"
                      onClick={() => alert('SMTP server reconnected')}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-850 hover:underline cursor-pointer"
                    >
                      Reconnect
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'emails' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Outbound Templates</h3>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Interview Outreach Email</label>
                <textarea
                  rows={6}
                  value={outreachTemplate}
                  onChange={(e) => setOutreachTemplate(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200/80 bg-white/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all glass-input"
                />
                <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
                  {"Supports dynamic tags: {{candidate_name}}, {{role_title}}."}
                </span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
