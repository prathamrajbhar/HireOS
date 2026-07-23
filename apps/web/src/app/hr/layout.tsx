'use client';

import React, { useState, useEffect } from 'react';
import HrSidebar from '@/components/HrSidebar';
import { Bell, Menu, X } from '@/lib/lucide-google-icons';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import Image from 'next/image';

export default function HrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [avatar, setAvatar] = useState('/avatar-boy.jpg');
  const [name, setName] = useState('Karan Malhotra');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Notification states
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Candidate Ananya Iyer completed mock session. Score: 85%.', time: '2 mins ago', read: false },
    { id: 2, text: 'Decision Agent flagged resume anomalies for application id_1092.', time: '40 mins ago', read: false },
    { id: 3, text: 'Bias Norm Compliance Audit passed for Stripe role.', time: '1 hour ago', read: false },
    { id: 4, text: 'New application received for Senior Frontend Developer.', time: '1 day ago', read: true },
    { id: 5, text: 'Billing: Stripe monthly usage limits auto-renewed.', time: '3 days ago', read: true }
  ]);

  useEffect(() => {
    const savedAvatar = localStorage.getItem('hr_avatar');
    const savedName = localStorage.getItem('hr_name');
    setTimeout(() => {
      if (savedAvatar) setAvatar(savedAvatar);
      if (savedName) setName(savedName);
    }, 0);

    // Listen for storage updates
    const handleStorageChange = () => {
      const updatedAvatar = localStorage.getItem('hr_avatar');
      const updatedName = localStorage.getItem('hr_name');
      if (updatedAvatar) setAvatar(updatedAvatar);
      if (updatedName) setName(updatedName);
    };

    window.addEventListener('storage', handleStorageChange);
    // Listen for custom profile update event
    window.addEventListener('hr_profile_update', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('hr_profile_update', handleStorageChange);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  useEffect(() => {
    if (!showNotifications) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.notification-container')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [showNotifications]);

  const toggleRead = (id: number) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: !n.read } : n));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50/50 dark:bg-slate-950/60 relative transition-colors duration-300">
      {/* Backdrop overlay for mobile */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/35 dark:bg-slate-950/70 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar container */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <HrSidebar avatar={avatar} name={name} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-white/60 dark:border-slate-800/80 bg-white/20 dark:bg-slate-900/60 backdrop-blur-sm flex items-center justify-between px-4 md:px-8 relative z-30 transition-colors duration-300">
          <div className="flex items-center gap-3">
            {/* Hamburger Menu Trigger */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer md:hidden flex items-center justify-center"
            >
              {isSidebarOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider hidden sm:inline">Recruiter Workspace</span>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {/* Dark Mode Toggle Button */}
            <ThemeToggle />

            {/* Notification Bell Dropdown */}
            <div className="notification-container relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer block"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
                )}
              </button>

              {showNotifications && (
                <>
                  {/* Popover Card */}
                  <div className="absolute right-0 mt-2.5 w-80 bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl rounded-3xl p-4 z-50 animate-in fade-in slide-in-from-top-3 duration-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase border border-purple-100 dark:border-purple-900/60">
                            {unreadCount} New
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={markAllAsRead}
                          className="text-[9px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                        >
                          Mark read
                        </button>
                        <span className="text-slate-300 dark:text-slate-700 text-[10px]">•</span>
                        <button
                          onClick={clearAll}
                          className="text-[9px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => toggleRead(n.id)}
                            className={`p-3 rounded-2xl border transition-all text-[11px] cursor-pointer flex gap-2 items-start ${n.read
                                ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold'
                                : 'bg-purple-50 dark:bg-purple-950/40 border-purple-100 dark:border-purple-900/50 text-slate-700 dark:text-slate-200 font-extrabold shadow-sm'
                              }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 mt-1.5 ${n.read ? 'bg-slate-300 dark:bg-slate-700' : 'bg-purple-500'}`} />
                            <div className="min-w-0 flex-1">
                              <p className="leading-relaxed break-words">{n.text}</p>
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold block mt-1">{n.time}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6">
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-bold block">All caught up!</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-0.5">No new system events found.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Recruiter Avatar info */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{name}</span>
              <Image
                src={avatar}
                alt="Recruiter Avatar"
                width={32}
                height={32}
                className="h-8 w-8 rounded-full border border-purple-100 dark:border-purple-900/60 shadow-sm object-cover"
                unoptimized
              />
            </div>

          </div>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
