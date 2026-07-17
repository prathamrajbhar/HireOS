'use client';

import React from 'react';
import { cn } from '@/lib/cn';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** Wraps the table in a horizontally-scrollable, rounded glass container */
  containerClassName?: string;
}

export function Table({ className, containerClassName, children, ...props }: TableProps) {
  return (
    <div className={cn('w-full overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/60', containerClassName)}>
      <table className={cn('w-full min-w-max border-collapse text-left text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('bg-slate-50/80 border-b border-slate-200/70', className)} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('divide-y divide-slate-100', className)} {...props}>
      {children}
    </tbody>
  );
}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  interactive?: boolean;
}

export function TableRow({ className, interactive = false, children, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        'transition-colors',
        interactive && 'cursor-pointer hover:bg-indigo-50/50',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export interface TableHeadCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right';
}

const alignClass = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function TableHeadCell({ className, align = 'left', children, ...props }: TableHeadCellProps) {
  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap',
        alignClass[align],
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right';
}

export function TableCell({ className, align = 'left', children, ...props }: TableCellProps) {
  return (
    <td
      className={cn('px-4 py-3.5 align-middle text-sm text-slate-700', alignClass[align], className)}
      {...props}
    >
      {children}
    </td>
  );
}
