'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { UserPlus, User, Building, Mail, Lock } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<'candidate' | 'hr'>('candidate');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || (role === 'hr' && !companyName)) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);

    // Simulate registration
    setTimeout(() => {
      setLoading(false);
      if (role === 'candidate') {
        router.push('/onboarding/candidate');
      } else {
        router.push('/onboarding/company');
      }
    }, 1000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/60 bg-white/45 p-8 shadow-xl backdrop-blur-md glass-panel animate-in zoom-in-95 duration-200">
        {/* Brand */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="relative h-10 w-10 rounded-full overflow-hidden group-hover:scale-105 transition-all flex-shrink-0 select-none">
              <Image
                src="/logo.png"
                alt="NextRound Logo"
                fill
                className="object-cover scale-[1.3]"
              />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 bg-clip-text text-transparent">
              Next<span className="text-brand-600">Round</span>
            </span>
          </Link>
          <h2 className="mt-4 text-xl font-extrabold text-slate-900 tracking-tight">Create your account</h2>
        </div>

        {/* Role Selector Toggle */}
        <div className="flex p-1 rounded-2xl bg-slate-200/50 border border-slate-200 select-none">
          <button
            type="button"
            onClick={() => setRole('candidate')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              role === 'candidate'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            I&apos;m looking for a job
          </button>
          <button
            type="button"
            onClick={() => setRole('hr')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              role === 'hr'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="h-3.5 w-3.5" />
            I&apos;m hiring candidates
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-xs font-semibold text-rose-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ananya Iyer"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200/80 bg-white/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all glass-input"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ananya.iyer@gmail.com"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200/80 bg-white/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all glass-input"
              />
            </div>
          </div>

          {role === 'hr' && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Company / Organization Name</label>
              <div className="relative">
                <Building className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Vercel Inc."
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200/80 bg-white/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all glass-input"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200/80 bg-white/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all glass-input"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-lg shadow-indigo-150 hover:bg-indigo-700 hover:shadow-xl transition-all cursor-pointer text-sm"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
              <UserPlus className="h-4.5 w-4.5" />
            </button>
          </div>
        </form>

        <div className="border-t border-slate-100 pt-6 text-center text-xs text-slate-500 font-semibold">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-indigo-600 hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
