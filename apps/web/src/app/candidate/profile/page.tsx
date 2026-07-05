'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  User, 
  FileText, 
  Check, 
  AlertTriangle, 
  Plus, 
  X, 
  Trash2, 
  Mail, 
  Link as LinkIcon, 
  Code,
  Sparkles,
  UploadCloud
} from 'lucide-react';

export default function CandidateProfile() {
  const [name, setName] = useState('Ananya Iyer');
  const [email, setEmail] = useState('ananya.iyer@gmail.com');
  const [avatar, setAvatar] = useState('/avatar-girl.jpg');
  const [linkedinUrl, setLinkedinUrl] = useState('https://linkedin.com/in/ananyaiyer');
  const [githubUrl, setGithubUrl] = useState('https://github.com/ananyaiyer');
  const [resumeName, setResumeName] = useState('ananya_iyer_cv.pdf');
  const [skills, setSkills] = useState<string[]>(['React', 'Next.js', 'TypeScript', 'WebAssembly', 'CSS Architecture']);
  const [newSkill, setNewSkill] = useState('');
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [detailsSaved, setDetailsSaved] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('candidate_name');
    const savedEmail = localStorage.getItem('candidate_email');
    const savedAvatar = localStorage.getItem('candidate_avatar');
    const savedLinkedin = localStorage.getItem('candidate_linkedin');
    const savedGithub = localStorage.getItem('candidate_github');
    
    setTimeout(() => {
      if (savedName) setName(savedName);
      if (savedEmail) setEmail(savedEmail);
      if (savedAvatar) setAvatar(savedAvatar);
      if (savedLinkedin) setLinkedinUrl(savedLinkedin);
      if (savedGithub) setGithubUrl(savedGithub);
    }, 0);
  }, []);

  const handleSaveDetails = () => {
    localStorage.setItem('candidate_name', name);
    localStorage.setItem('candidate_email', email);
    localStorage.setItem('candidate_avatar', avatar);
    localStorage.setItem('candidate_linkedin', linkedinUrl);
    localStorage.setItem('candidate_github', githubUrl);
    
    // Dispatch event to update layout header
    window.dispatchEvent(new Event('profile_update'));

    setDetailsSaved(true);
    setTimeout(() => setDetailsSaved(false), 2000);
  };

  const handleCustomAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (tag: string) => {
    setSkills(skills.filter((s) => s !== tag));
  };

  const handleDeleteData = () => {
    setIsDeleting(true);
    setTimeout(() => {
      setIsDeleting(false);
      setDeleted(true);
    }, 1500);
  };

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeName(file.name);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* SaaS Page Header */}
      <div className="border-b border-slate-200/80 pb-4">
        <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest block mb-1">
          Identity Center
        </span>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Profile</h1>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Manage your reusable unified profile tags, social links, and credentials.
        </p>
      </div>

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Form & Skills */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* General Details */}
          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 sm:p-8 shadow-xl shadow-slate-200/35 backdrop-blur-md glass-panel space-y-6">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
              <User className="h-4.5 w-4.5 text-emerald-600" />
              Candidate Details
            </h3>
            
            {/* Avatar Selector */}
            <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-slate-100/60 pb-5">
              <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-slate-200 shadow-sm flex-shrink-0">
                <Image src={avatar} alt="Profile Avatar" width={64} height={64} className="h-full w-full object-cover" unoptimized />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select Profile Avatar</label>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAvatar('/avatar-boy.jpg')}
                    className={`h-10 w-10 rounded-full overflow-hidden border-2 cursor-pointer transition-all ${
                      avatar === '/avatar-boy.jpg' ? 'border-emerald-500 scale-105 shadow-md shadow-emerald-50' : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Image src="/avatar-boy.jpg" alt="Avatar Boy" width={40} height={40} className="h-full w-full object-cover" unoptimized />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatar('/avatar-girl.jpg')}
                    className={`h-10 w-10 rounded-full overflow-hidden border-2 cursor-pointer transition-all ${
                      avatar === '/avatar-girl.jpg' ? 'border-emerald-500 scale-105 shadow-md shadow-emerald-50' : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Image src="/avatar-girl.jpg" alt="Avatar Girl" width={40} height={40} className="h-full w-full object-cover" unoptimized />
                  </button>
                  
                  <label className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-655 text-[10px] font-extrabold px-3 py-2 cursor-pointer transition-all shadow-sm flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-slate-500" />
                    <span>Upload Custom</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCustomAvatarUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white focus:outline-none focus:border-emerald-500 transition-all focus:ring-2 focus:ring-emerald-500/10 font-semibold"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white focus:outline-none focus:border-emerald-500 transition-all focus:ring-2 focus:ring-emerald-500/10 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">LinkedIn Profile URL</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white focus:outline-none focus:border-emerald-500 transition-all focus:ring-2 focus:ring-emerald-500/10 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">GitHub Profile URL</label>
                <div className="relative">
                  <Code className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white focus:outline-none focus:border-emerald-500 transition-all focus:ring-2 focus:ring-emerald-500/10 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Save details action */}
            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 items-center">
              {detailsSaved && (
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full p-1.5 flex items-center justify-center animate-in scale-in duration-200 shadow-sm">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveDetails}
                className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold px-6 py-2.5 text-xs shadow-md shadow-emerald-100 hover:shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01]"
              >
                Save
              </button>
            </div>
          </div>

          {/* Skills Management */}
          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-md backdrop-blur-md glass-panel space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-emerald-600 animate-pulse" />
              Skills & Vetting Keywords
            </h3>
            
            <div className="flex flex-wrap gap-1.5 mb-2">
              {skills.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 shadow-sm"
                >
                  {s}
                  <button type="button" onClick={() => handleRemoveSkill(s)} className="hover:text-emerald-950 cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            
            <form onSubmit={handleAddSkill} className="flex gap-2">
              <input
                type="text"
                placeholder="Add new skill tag (e.g. Docker, Python)..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                className="flex-grow px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white focus:outline-none focus:border-emerald-500 transition-all focus:ring-2 focus:ring-emerald-500/10 font-semibold"
              />
              <button
                type="submit"
                className="rounded-xl bg-slate-900 text-white font-extrabold text-xs px-4 hover:bg-slate-800 cursor-pointer flex items-center justify-center shadow-md shadow-slate-200"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* GDPR Danger Zone */}
          <div className="rounded-3xl border border-rose-100 bg-rose-50/15 p-6 shadow-sm glass-panel space-y-4">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-sm font-black">Danger Zone</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Under GDPR directives, you have the right to inspect and purge your profile, resumes, evaluations, and voice audio logs instantly.
            </p>
            {deleted ? (
              <div className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">
                Data deletion request logged. Processing account cleanup.
              </div>
            ) : (
              <button
                onClick={handleDeleteData}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow-sm shadow-rose-50"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Processing purge request...' : 'Purge All My Account Data'}
              </button>
            )}
          </div>
        </div>

        {/* Right Column: CV & Progress */}
        <div className="space-y-6">
          
          {/* Completeness gauge */}
          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-md backdrop-blur-md glass-panel text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completeness</span>
            <div className="relative h-24 w-24 mx-auto my-4 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-500 animate-dash"
                  strokeDasharray="90, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-lg font-black text-slate-800">90%</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 w-fit mx-auto block mb-2">
              Profile Calibrated
            </span>
            <span className="text-[10px] font-semibold text-slate-450 block leading-relaxed">
              Verify your skills to unlock 100% match scoring values.
            </span>
          </div>

          {/* Active CV Box */}
          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-md backdrop-blur-md glass-panel space-y-4">
            <h3 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-2">Active Resume</h3>
            
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-indigo-700 shadow-sm shadow-indigo-50">
              <FileText className="h-5 w-5 flex-shrink-0" />
              <div className="min-w-0 flex-grow">
                <span className="text-xs font-extrabold truncate block leading-none">{resumeName}</span>
                <span className="text-[9px] text-slate-400 font-semibold block mt-1">Uploaded 2 days ago</span>
              </div>
            </div>

            <label className="w-full text-center text-xs font-extrabold text-indigo-600 hover:text-indigo-700 transition-colors py-2 cursor-pointer block border border-dashed border-indigo-200 bg-indigo-50/10 rounded-2xl shadow-inner hover:bg-indigo-50/20">
              <UploadCloud className="h-4.5 w-4.5 mx-auto mb-1 text-indigo-500" />
              <span>Replace Resume PDF</span>
              <input
                type="file"
                accept=".pdf"
                onChange={handleResumeUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

      </div>
    </div>
  );
}
