'use client';

import React, { useState } from 'react';
import { Bell, Shield, Check } from '@/lib/lucide-google-icons';

export default function CandidateSettingsPage() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [profileVisible, setProfileVisible] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200">
      <div className="border-b border-slate-200/60 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Account Settings</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
          Configure notifications, account security, and dashboard options.
        </p>
      </div>

      <div className="rounded-3xl border border-white/60 dark:border-slate-800 bg-white/45 dark:bg-slate-900/60 p-6 shadow-md backdrop-blur-md glass-panel space-y-6">
        {/* Notifications */}
        <div className="space-y-3.5">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200/60 dark:border-slate-800 pb-2 flex items-center gap-1.5">
            <Bell className="h-4.5 w-4.5 text-brand-500 dark:text-orange-400" />
            Notification Settings
          </h3>
          <div className="space-y-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="flex justify-between items-center">
              <div>
                <span className="block">Email Alerts</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-400 block mt-0.5">Receive job invite notifications</span>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-0 cursor-pointer"
              />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <span className="block">SMS Reminders</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-400 block mt-0.5">Receive scheduler text confirmation links</span>
              </div>
              <input
                type="checkbox"
                checked={smsAlerts}
                onChange={(e) => setSmsAlerts(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="space-y-3.5">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200/60 dark:border-slate-800 pb-2 flex items-center gap-1.5">
            <Shield className="h-4.5 w-4.5 text-brand-500 dark:text-orange-400" />
            Privacy &amp; Visibility
          </h3>
          <div className="space-y-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="flex justify-between items-center">
              <div>
                <span className="block">Directory Visibility</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-400 block mt-0.5">Allow recruiters to find and source your profile</span>
              </div>
              <input
                type="checkbox"
                checked={profileVisible}
                onChange={(e) => setProfileVisible(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800 flex justify-end gap-3 items-center">
          {saved && (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 rounded px-2.5 py-1 flex items-center gap-1">
              <Check className="h-3.5 w-3.5" />
              Preferences Saved
            </span>
          )}
          <button
            onClick={handleSave}
            className="rounded-full bg-brand-600 dark:bg-orange-600 hover:bg-brand-700 dark:hover:bg-orange-700 text-white font-bold px-5 py-2 text-xs shadow-sm transition-all cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
