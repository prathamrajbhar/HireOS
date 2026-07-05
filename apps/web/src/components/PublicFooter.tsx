import React from 'react';
import Link from 'next/link';

export default function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white/20 backdrop-blur-sm py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <span className="text-lg font-bold bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent">
              Hire<span className="text-indigo-600">OS</span>
            </span>
            <p className="text-sm text-slate-500 max-w-xs">
              The AI-native recruitment marketplace running zero-human operations to screen, interview, and decide offers.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform</h4>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/jobs" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">
                  Explore Jobs
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link href="/signup" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">
                  Post a Job
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Trust & Security</h4>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/about" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">
                  Bias Audit Reports
                </Link>
              </li>
              <li>
                <span className="text-sm text-slate-600">GDPR Data Isolation</span>
              </li>
              <li>
                <span className="text-sm text-slate-600">Opt-in Proctor Consent</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Disclaimer</h4>
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} HireOS Inc. All rights reserved. Built for modern recruiting teams and advanced preparation.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
