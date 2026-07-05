'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Briefcase, 
  BarChart3, 
  Settings, 
  CircleDot, 
  User,
  Activity,
  LogOut
} from 'lucide-react';

interface HrSidebarProps {
  avatar?: string;
  name?: string;
}

export default function HrSidebar({ avatar = '/avatar-boy.jpg', name = 'Karan Malhotra' }: HrSidebarProps) {
  const pathname = usePathname();

  const menuGroups = [
    {
      title: 'Console',
      items: [
        { name: 'Overview', path: '/hr/dashboard', icon: LayoutDashboard },
        { name: 'Jobs', path: '/hr/jobs', icon: Briefcase },
        { name: 'Analytics', path: '/hr/analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'Settings',
      items: [
        { name: 'Profile', path: '/hr/profile', icon: User },
        { name: 'Settings', path: '/hr/settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 border-r border-white/60 bg-white/30 backdrop-blur-md flex flex-col p-4 h-screen">
      {/* Brand Logo & Workspace Switcher */}
      <div className="mb-6 px-2">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-purple-500 to-indigo-600 font-bold text-white shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform duration-200 select-none">
            H
          </span>
          <span className="font-extrabold text-lg tracking-tight text-slate-800">
            Hire<span className="text-purple-600 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">OS</span>
          </span>
        </Link>
        
        <div className="mt-4 flex items-center justify-between px-3 py-2 rounded-xl border border-purple-100 bg-purple-50/30 text-purple-700 font-bold text-xs select-none">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-450 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
            <span className="text-slate-700 font-semibold tracking-wide">Vercel Workspace</span>
          </div>
          <CircleDot className="h-3.5 w-3.5 text-purple-500/70" />
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-grow space-y-6">
        {menuGroups.map((group) => (
          <div key={group.title} className="space-y-1.5">
            <span className="px-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 block select-none">
              {group.title}
            </span>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.path || (item.path !== '/hr/dashboard' && pathname.startsWith(item.path));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-[background-color,color,border-color] border-l-2 duration-200 select-none ${
                      isActive
                        ? 'bg-purple-600/8 text-purple-700 border-purple-600 shadow-[sm_inset_0_1px_1px_rgba(255,255,255,0.4)]'
                        : 'text-slate-500 border-transparent hover:bg-slate-100/40 hover:text-slate-800'
                    }`}
                  >
                    <Icon className={`h-4.5 w-4.5 transition-transform duration-200 ease-out group-hover:scale-110 ${
                      isActive ? 'text-purple-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`} />
                    <span className="flex-1">{item.name}</span>
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500 opacity-80" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Section */}
      <div className="mt-auto space-y-4 pt-4 border-t border-slate-100/60">
        {/* Live pipeline count box */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50/40 to-indigo-50/20 border border-purple-100/40 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-1">
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <Activity className="h-3.5 w-3.5 text-purple-500" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">AI Vetting</span>
          </div>
          <p className="text-xs font-bold text-slate-700 select-none">Agent Active</p>
          <span className="text-[9px] text-slate-400 font-semibold block mt-0.5 select-none">
            Synced: 2m ago
          </span>
        </div>

        {/* User Profile Card */}
        <div className="flex items-center justify-between p-2 rounded-2xl border border-slate-100 bg-white/40 hover:bg-white/60 transition-colors duration-250">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex-shrink-0">
              <Image
                src={avatar}
                alt={name}
                width={36}
                height={36}
                className="h-9 w-9 rounded-xl border border-purple-100 shadow-sm object-cover"
                unoptimized
              />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white"></span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate leading-tight">{name}</p>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">HR Manager</p>
            </div>
          </div>
          <button 
            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 transition-colors duration-200 cursor-pointer"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
