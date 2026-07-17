'use client';

import React from 'react';
import { Terminal } from 'lucide-react';

interface AgentLogsPanelProps {
  logs: string[];
}

export default function AgentLogsPanel({ logs }: AgentLogsPanelProps) {
  return (
    <div className="space-y-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
          <Terminal className="h-4.5 w-4.5 text-purple-600" />
          Agent Logs (Streaming)
        </h3>
        {/* Pulsating green dot */}
        <div className="flex items-center gap-1.5 select-none bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5 shadow-sm text-[9px] text-emerald-800 font-extrabold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse block animate-duration-1000" />
          LIVE FEED
        </div>
      </div>

      {/* Terminal logs list */}
      <div className="rounded-2xl border border-white/60 bg-white/45 p-4 shadow-md backdrop-blur-md glass-panel text-[10px] text-slate-700 space-y-2 h-[350px] overflow-y-auto font-mono scrollbar-thin scrollbar-thumb-slate-200">
        {logs.length > 0 ? (
          logs.map((log, idx) => (
            <div 
              key={idx} 
              className="leading-relaxed border-b border-slate-100/50 pb-2 last:border-0 font-semibold animate-in slide-in-from-top-1 duration-150"
            >
              <span className="text-indigo-650 font-extrabold select-none">&gt;&nbsp;</span>
              {log}
            </div>
          ))
        ) : (
          <div className="text-center py-16 text-slate-400 font-semibold">
            <span className="block italic select-none">No logs recorded yet.</span>
            <span className="block text-[9px] mt-0.5 select-none">Agent activities will appear here.</span>
          </div>
        )}
      </div>
    </div>
  );
}
