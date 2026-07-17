'use client';

import React, { useId, useState } from 'react';
import { cn } from '@/lib/cn';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const sideClass: Record<NonNullable<TooltipProps['side']>, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {React.cloneElement(children, { 'aria-describedby': id } as Record<string, unknown>)}
      <span
        role="tooltip"
        id={id}
        className={cn(
          'absolute z-50 pointer-events-none whitespace-nowrap px-2.5 py-1.5 rounded-lg',
          'text-[11px] font-bold text-white bg-slate-900/95 shadow-lg transition-opacity duration-150',
          open ? 'opacity-100' : 'opacity-0',
          sideClass[side],
          className
        )}
      >
        {content}
      </span>
    </span>
  );
}
