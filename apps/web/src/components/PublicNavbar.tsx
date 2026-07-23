'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { CreditCard, HelpCircle, LogIn, ArrowRight } from '@/lib/lucide-google-icons';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function PublicNavbar() {
  const pathname = usePathname();

  const links = [
    { name: 'About NextRound', path: '/about', icon: HelpCircle },
    { name: 'Pricing', path: '/pricing', icon: CreditCard },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/60 dark:border-white/10 bg-white/40 dark:bg-slate-900/80 backdrop-blur-md transition-all">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative h-10 w-10 rounded-full overflow-hidden group-hover:scale-105 transition-all flex-shrink-0 select-none">
                <Image
                  src="/logo.png"
                  alt="NextRound Logo"
                  fill
                  className="object-cover scale-[1.3]"
                />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 dark:from-slate-100 dark:via-orange-200 dark:to-slate-100 bg-clip-text text-transparent">
                Next<span className="text-brand-600">Round</span>
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            {links.map((link) => {
              const isActive = pathname === link.path;
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`text-sm font-semibold transition-colors flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-orange-400 ${
                    isActive
                      ? 'text-indigo-600 dark:text-orange-400 font-bold'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <ThemeToggle />

            <Link
              href="/login"
              className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-orange-400 transition-colors flex items-center gap-1"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
            <Link
              href="/signup"
              className="hidden sm:flex items-center gap-1.5 rounded-full bg-indigo-600 dark:bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-100 dark:shadow-orange-900/30 hover:bg-indigo-700 dark:hover:bg-orange-700 hover:shadow-lg transition-all"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
