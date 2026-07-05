'use client';

import React, { useState, useEffect } from 'react';
import CandidateSidebar from '@/components/CandidateSidebar';
import { Bell, Menu, X } from 'lucide-react';
import Image from 'next/image';

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [avatar, setAvatar] = useState('/avatar-girl.jpg');
  const [name, setName] = useState('Ananya Iyer');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Notification states
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Mock practice evaluation report for Google Software Engineer is ready.', time: '5 mins ago', read: false },
    { id: 2, text: 'Vercel shortlisted your profile: interview scheduling requested.', time: '1 hour ago', read: false },
    { id: 3, text: 'Stripe screening agent: Resume logic tags matched 90%.', time: '2 hours ago', read: false },
    { id: 4, text: 'New Frontend Engineer position posted at Microsoft.', time: '3 hours ago', read: true },
    { id: 5, text: 'Evaluation feedback calibrated for Technical Logic: improved by 15%.', time: '5 hours ago', read: true }
  ]);

  useEffect(() => {
    // Load initial values from localStorage
    const savedAvatar = localStorage.getItem('candidate_avatar');
    const savedName = localStorage.getItem('candidate_name');
    setTimeout(() => {
      if (savedAvatar) setAvatar(savedAvatar);
      if (savedName) setName(savedName);
    }, 0);

    // Listen for storage updates
    const handleStorageChange = () => {
      const updatedAvatar = localStorage.getItem('candidate_avatar');
      const updatedName = localStorage.getItem('candidate_name');
      if (updatedAvatar) setAvatar(updatedAvatar);
      if (updatedName) setName(updatedName);
    };

    window.addEventListener('storage', handleStorageChange);
    // Listen for custom profile update event
    window.addEventListener('profile_update', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profile_update', handleStorageChange);
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
    <div className="flex h-screen overflow-hidden bg-slate-50/50 relative">
      {/* Backdrop overlay for mobile */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/35 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar container */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-305 ease-in-out md:relative md:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <CandidateSidebar avatar={avatar} name={name} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-white/60 bg-white/20 backdrop-blur-sm flex items-center justify-between px-4 md:px-8 relative z-30">
          <div className="flex items-center gap-3">
            {/* Hamburger Menu Trigger */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white/50 text-slate-500 hover:text-slate-800 hover:bg-white transition-all cursor-pointer md:hidden flex items-center justify-center"
            >
              {isSidebarOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider hidden sm:inline">Candidate Workspace</span>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Notification Bell Dropdown */}
            <div className="notification-container relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-1.5 rounded-lg border border-slate-200 bg-white/50 text-slate-500 hover:text-slate-800 hover:bg-white transition-all cursor-pointer block"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                )}
              </button>

              {showNotifications && (
                <>
                  {/* Popover Card */}
                  <div className="absolute right-0 mt-2.5 w-80 bg-slate-100 border border-slate-200/80 shadow-2xl rounded-3xl p-4 z-50 animate-in fade-in slide-in-from-top-3 duration-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-800">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-[9px] font-black text-emerald-700 uppercase border border-emerald-100">
                            {unreadCount} New
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={markAllAsRead}
                          className="text-[9px] font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
                        >
                          Mark read
                        </button>
                        <span className="text-slate-200 text-[10px]">•</span>
                        <button 
                          onClick={clearAll}
                          className="text-[9px] font-bold text-rose-600 hover:text-rose-700 transition-colors"
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
                            className={`p-3 rounded-2xl border transition-all text-[11px] cursor-pointer flex gap-2 items-start ${
                              n.read 
                                ? 'bg-slate-50 border-slate-200/60 text-slate-400 font-semibold' 
                                : 'bg-emerald-50 border-emerald-100 text-slate-700 font-extrabold shadow-sm'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 mt-1.5 ${n.read ? 'bg-slate-300' : 'bg-emerald-500'}`} />
                            <div className="min-w-0 flex-1">
                              <p className="leading-relaxed break-words">{n.text}</p>
                              <span className="text-[9px] text-slate-400 font-semibold block mt-1">{n.time}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6">
                          <span className="text-xs text-slate-450 font-bold block">All caught up!</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">No new system events found.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Candidate Avatar Info */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">{name}</span>
              <Image
                src={avatar}
                alt="Candidate Avatar"
                width={32}
                height={32}
                className="h-8 w-8 rounded-full border border-emerald-100 shadow-sm object-cover"
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
