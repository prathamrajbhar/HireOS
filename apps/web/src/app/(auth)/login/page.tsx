'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
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
      toast({ title: 'Signed in successfully', variant: 'success' });
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
          <h2 className="mt-6 text-xl font-extrabold text-slate-900 tracking-tight">Sign in to your account</h2>
          <p className="mt-1.5 text-xs text-slate-500 font-semibold">
            Access your hiring dashboard or candidate portal.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-xs font-semibold text-rose-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input
            label="Email address"
            type="email"
            required
            icon={<Mail className="h-4.5 w-4.5" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ananya.iyer@gmail.com (or recruiter@swiggy.in)"
          />

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Password</label>
              <Link href="/forgot-password" className="text-xs font-semibold text-indigo-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              type="password"
              required
              icon={<Lock className="h-4.5 w-4.5" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" loading={loading} fullWidth size="lg" rightIcon={<LogIn className="h-4.5 w-4.5" />}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
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
