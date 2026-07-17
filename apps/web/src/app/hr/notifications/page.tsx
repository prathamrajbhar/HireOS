'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, ArrowRight, CheckCircle2, Sparkles, Scale, Mic, Send, AlertTriangle } from 'lucide-react';
import { mockNotifications, type Notification } from '@/lib/mockData';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';

type FilterKey = 'all' | 'unread' | Notification['type'];

const typeMeta: Record<Notification['type'], { label: string; icon: React.ReactNode; className: string }> = {
  pipeline: { label: 'Pipeline', icon: <Sparkles className="h-3.5 w-3.5" />, className: 'bg-indigo-50 border-indigo-100 text-indigo-600' },
  decision: { label: 'Decision', icon: <Scale className="h-3.5 w-3.5" />, className: 'bg-purple-50 border-purple-100 text-purple-600' },
  interview: { label: 'Interview', icon: <Mic className="h-3.5 w-3.5" />, className: 'bg-sky-50 border-sky-100 text-sky-600' },
  offer: { label: 'Offer', icon: <Send className="h-3.5 w-3.5" />, className: 'bg-emerald-50 border-emerald-100 text-emerald-600' },
  alert: { label: 'Alert', icon: <AlertTriangle className="h-3.5 w-3.5" />, className: 'bg-amber-50 border-amber-100 text-amber-600' },
};

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'decision', label: 'Decision' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'alert', label: 'Alert' },
];

export default function HrNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    // Simulated fetch — mock-data-driven for now, real endpoint wiring is a
    // later phase; the skeleton loading state below is real, not mocked away.
    const t = setTimeout(() => {
      setNotifications(mockNotifications);
      setLoading(false);
    }, 500);
    return () => clearTimeout(t);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const visible = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.type === filter);
  }, [notifications, filter]);

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto anim-fade-in">
      <div className="border-b border-slate-100 pb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6 text-purple-600" />
            System Notifications
            {unreadCount > 0 && <Badge intent="rose">{unreadCount} new</Badge>}
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Review critical events triggered by pipeline and evaluation agents.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={markAllAsRead}>
            Mark all read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              filter === f.key
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white/50 text-slate-500 border-slate-200/80 hover:bg-white hover:text-slate-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="No notifications here"
          description="You're all caught up — new agent activity will show up in this feed as it happens."
        />
      ) : (
        <div className="rounded-3xl border border-white/60 bg-white/45 p-6 shadow-md backdrop-blur-md glass-panel space-y-3">
          {visible.map((n) => {
            const meta = typeMeta[n.type];
            return (
              <div
                key={n.id}
                className={`flex items-start justify-between gap-4 p-4 rounded-2xl border text-xs font-semibold transition-all hover:shadow-sm ${
                  n.read ? 'border-slate-100 bg-white/40 text-slate-500' : 'border-indigo-100 bg-white/60 text-slate-700'
                }`}
              >
                <div className="flex gap-3">
                  <span className={`h-7 w-7 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 ${meta.className}`}>
                    {meta.icon}
                  </span>
                  <div>
                    <p className={n.read ? 'text-slate-600 leading-relaxed' : 'text-slate-800 leading-relaxed'}>{n.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400 font-semibold">{n.time}</span>
                      {!n.read && (
                        <button
                          onClick={() => markAsRead(n.id)}
                          className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <Link
                  href={n.link}
                  className="inline-flex items-center gap-0.5 text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors mt-0.5 flex-shrink-0"
                >
                  Details
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
