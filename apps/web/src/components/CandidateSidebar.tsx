'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Compass,
  Briefcase,
  Mic,
  Library,
  User,
  Settings,
  LogOut
} from 'lucide-react';

interface CandidateSidebarProps {
  avatar?: string;
  name?: string;
}

export default function CandidateSidebar({ avatar = '/avatar-girl.jpg', name = 'Ananya Iyer' }: CandidateSidebarProps) {
  const pathname = usePathname();

  const menuGroups = [
    {
      title: 'Menu',
      items: [
        { name: 'Dashboard', path: '/candidate/dashboard', icon: LayoutDashboard },
        { name: 'Jobs', path: '/candidate/jobs', icon: Compass },
        { name: 'Applications', path: '/candidate/applications', icon: Briefcase },
      ],
    },
    {
      title: 'Prep',
      items: [
        { name: 'Mock Interview', path: '/candidate/mock/new', icon: Mic },
        { name: 'Prep Library', path: '/candidate/prep', icon: Library },
      ],
    },
    {
      title: 'Account',
      items: [
        { name: 'Profile', path: '/candidate/profile', icon: User },
        { name: 'Settings', path: '/candidate/settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 border-r border-white/60 bg-white/30 backdrop-blur-md flex flex-col p-4 h-screen">
      {/* Brand Logo inside Dashboard */}
      <div className="mb-6 px-2">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative h-9 w-9 rounded-full overflow-hidden group-hover:scale-105 transition-transform duration-200 flex-shrink-0 select-none">
            <Image
              src="/logo.png"
              alt="NextRound Logo"
              fill
              className="object-cover scale-[1.3]"
            />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-slate-800">
            Next<span className="text-success-600 bg-gradient-to-r from-success-600 to-brand-600 bg-clip-text text-transparent">Round</span>
          </span>
        </Link>
        <span className="text-[10px] text-emerald-600 font-extrabold tracking-widest uppercase block mt-1 ml-11 select-none">
          Candidate Portal
        </span>
      </div>

      {/* Nav Menu */}
      <nav className="flex-grow space-y-5">
        {menuGroups.map((group) => (
          <div key={group.title} className="space-y-1.5">
            <span className="px-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 block select-none">
              {group.title}
            </span>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                // Determine isActive. Special handling for /candidate/mock paths.
                const isActive = pathname === item.path ||
                  (item.path !== '/candidate/dashboard' && pathname.startsWith(item.path)) ||
                  (item.path === '/candidate/mock/new' && pathname.startsWith('/candidate/mock'));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-[background-color,color,border-color] border-l-2 duration-200 select-none ${isActive
                      ? 'bg-emerald-600/8 text-emerald-700 border-emerald-600 shadow-[sm_inset_0_1px_1px_rgba(255,255,255,0.4)]'
                      : 'text-slate-500 border-transparent hover:bg-slate-100/40 hover:text-slate-800'
                      }`}
                  >
                    <Icon className={`h-4.5 w-4.5 transition-transform duration-200 ease-out group-hover:scale-110 ${isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-650'
                      }`} />
                    <span className="flex-1">{item.name}</span>
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 opacity-80" />
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
        {/* User Profile Card */}
        <div className="flex items-center justify-between p-2 rounded-2xl border border-slate-100 bg-white/40 hover:bg-white/60 transition-colors duration-250">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex-shrink-0">
              <Image
                src={avatar}
                alt={name}
                width={36}
                height={36}
                className="h-9 w-9 rounded-xl border border-emerald-100 shadow-sm object-cover"
                unoptimized
              />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white"></span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate leading-tight">{name}</p>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Software Applicant</p>
            </div>
          </div>
          <button
            className="p-1 rounded-lg text-slate-400 hover:text-rose-605 hover:bg-rose-50/50 transition-colors duration-200 cursor-pointer"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
