'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface AutocompleteProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  icon?: React.ReactNode;
  error?: string;
  hint?: string;
  label?: string;
  wrapperClassName?: string;
}

export const Autocomplete = React.forwardRef<HTMLInputElement, AutocompleteProps>(
  ({ className, wrapperClassName, options, value, onChange, icon, error, hint, label, id, placeholder, ...props }, ref) => {
    const inputId = id || props.name;
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);

    // Filtered options based on query
    const filteredOptions = options.filter((opt) =>
      opt.toLowerCase().includes(value.toLowerCase())
    );

    // Close on click outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset active index when filtered options list changes or dropdown opens
    useEffect(() => {
      setActiveIndex(-1);
    }, [value, isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (filteredOptions.length > 0) {
          setActiveIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (isOpen && filteredOptions.length > 0) {
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        }
      } else if (e.key === 'Enter') {
        if (isOpen && activeIndex >= 0 && activeIndex < filteredOptions.length) {
          e.preventDefault();
          onChange(filteredOptions[activeIndex]);
          setIsOpen(false);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    return (
      <div ref={containerRef} className={cn('relative w-full', wrapperClassName)}>
        {label && (
          <label htmlFor={inputId} className="text-xs font-bold text-slate-700 block mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none flex items-center justify-center">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            autoComplete="off"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full py-2.5 text-sm rounded-xl bg-white/50 transition-all glass-input pr-10',
              'placeholder:text-slate-400 placeholder:font-medium',
              'focus:outline-none focus:bg-white',
              icon ? 'pl-10' : 'pl-4',
              error && 'border-danger-300 focus:border-danger-500',
              props.disabled && 'opacity-60 cursor-not-allowed',
              className
            )}
            placeholder={placeholder}
            aria-invalid={!!error}
            {...props}
          />
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 hover:text-slate-655 cursor-pointer flex items-center justify-center"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')} />
          </button>
        </div>

        {isOpen && (filteredOptions.length > 0 || value.trim() !== '') && (
          <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border border-white/60 bg-white/80 shadow-xl backdrop-blur-md glass-panel py-1 animate-in fade-in slide-in-from-top-1 duration-150">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, index) => {
                const isSelected = value.toLowerCase() === opt.toLowerCase();
                const isActive = index === activeIndex;
                return (
                  <div
                    key={opt}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      'px-4 py-2 text-xs font-semibold text-slate-700 cursor-pointer transition-all flex items-center justify-between',
                      isActive ? 'bg-indigo-650 text-white' : 'hover:bg-slate-50',
                      isSelected && !isActive && 'text-indigo-650 bg-indigo-50/50'
                    )}
                  >
                    <span>{opt}</span>
                    {isSelected && (
                      <span className={cn('text-[10px] font-bold', isActive ? 'text-white' : 'text-indigo-650')}>
                        Selected
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-2.5 text-xs font-semibold text-slate-400">
                No matching suggestions. Press Enter to use custom value.
              </div>
            )}
          </div>
        )}

        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs font-semibold text-danger-600">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-xs font-medium text-slate-450">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Autocomplete.displayName = 'Autocomplete';
