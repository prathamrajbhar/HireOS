'use client';

import React from 'react';

interface KanbanColumnProps {
  id: string;
  name: string;
  count: number;
  children: React.ReactNode;
}

export default function KanbanColumn({
  name,
  count,
  children,
}: KanbanColumnProps) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/20 p-3 shadow-sm backdrop-blur-sm glass-panel space-y-3 min-h-[450px] flex flex-col transition-all hover:bg-white/25">
      {/* Column Header */}
      <div className="flex justify-between items-center px-1 border-b border-slate-150/40 pb-2 flex-shrink-0 select-none">
        <span className="text-xs font-black text-slate-800 tracking-tight uppercase">
          {name}
        </span>
        <span className="h-5 w-5 rounded-full bg-slate-200/60 text-[10px] font-bold text-slate-600 flex items-center justify-center border border-slate-300/20 shadow-inner">
          {count}
        </span>
      </div>

      {/* Column Body / Scroll area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 scrollbar-thin scrollbar-thumb-slate-200/50">
        {count > 0 ? (
          children
        ) : (
          <div className="flex-grow flex items-center justify-center py-20 text-center border border-dashed border-slate-300/40 rounded-xl bg-white/10 select-none">
            <span className="text-[10px] text-slate-400 font-bold block">
              No candidates
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
