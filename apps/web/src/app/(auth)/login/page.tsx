'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);

    // Simulate authentication
    setTimeout(() => {
      setLoading(false);
      // Simple routing based on email role trigger for convenience
      if (email.toLowerCase().includes('candidate') || email.toLowerCase().includes('jane')) {
        router.push('/candidate/dashboard');
      } else {
        router.push('/hr/dashboard');
      }
    }, 1000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-white/60 bg-white/45 p-8 shadow-xl backdrop-blur-md glass-panel animate-in zoom-in-95 duration-200">
        {/* Brand */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 font-bold text-white shadow-md shadow-indigo-200 transition-all group-hover:scale-105">
              H
            </span>
            <span className="text-xl font-bold bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent">
              Hire<span className="text-indigo-600">OS</span>
            </span>
          </Link>
          <h2 className="mt-6 text-xl font-extrabold text-slate-900 tracking-tight">Sign In to Your Workspace</h2>
          <p className="mt-1.5 text-xs text-slate-500 font-semibold">
            Use candidate or recruiter demo credentials to test.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-xs font-semibold text-rose-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ananya.iyer@gmail.com (or recruiter@swiggy.in)"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200/80 bg-white/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all glass-input"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Password</label>
              <Link href="/forgot-password" className="text-xs font-semibold text-indigo-600 hover:underline">
                Forgot password?
              </Link>
            </div>
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
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:shadow-xl transition-all cursor-pointer text-sm"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              <LogIn className="h-4.5 w-4.5" />
            </button>
          </div>
        </form>

        <div className="border-t border-slate-100 pt-6 text-center text-xs text-slate-500 font-semibold">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-bold text-indigo-600 hover:underline inline-flex items-center gap-0.5">
            Sign Up
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
