'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
}

const sizeClass = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

/**
 * Generic replacement for the previously hand-rolled per-screen modals
 * (e.g. EditThresholdModal). Handles portal mounting, Escape-to-close,
 * backdrop click, and body scroll lock so individual screens only need to
 * supply content.
 */
export function Modal({ isOpen, onClose, title, description, children, footer, size = 'md', icon }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 anim-fade-in"
      onClick={onClose}
    >
      <div
        className={cn(
          'w-full glass-card !bg-white/90 p-6 relative anim-zoom-in space-y-4 max-h-[90vh] overflow-y-auto',
          sizeClass[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 pb-3">
            <div className="flex items-start gap-2">
              {icon && <span className="text-purple-600 mt-0.5">{icon}</span>}
              <div>
                {title && <h3 className="text-sm font-black text-slate-800">{title}</h3>}
                {description && <p className="text-xs font-medium text-slate-500 mt-0.5">{description}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div>{children}</div>

        {footer && <div className="pt-3 border-t border-slate-200/70 flex items-center gap-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
