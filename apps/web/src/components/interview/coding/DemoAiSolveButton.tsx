'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2, Check } from '@/lib/lucide-google-icons';
import { apiClient } from '@/lib/apiClient';
import type { SupportedLanguage } from './useCodingProblem';

const SIZE = 52;
const MARGIN = 12;
const DRAG_THRESHOLD_PX = 5;
const THINK_MS = 1400;
const TYPE_STEPS = 40;
const TYPE_MS = 30;

interface DemoAiSolveButtonProps {
  problemId: string;
  language: SupportedLanguage;
  onSolution: (code: string) => void;
}

type Phase = 'idle' | 'thinking' | 'typing' | 'done';

const clamp = (value: number, max: number) => Math.min(Math.max(MARGIN, value), Math.max(MARGIN, max));

/** Presentation-only floating button: drag to move, click to let "AI" write the solution into the editor. */
export function DemoAiSolveButton({ problemId, language, onSolution }: DemoAiSolveButtonProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const drag = useRef({ active: false, moved: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const typer = useRef<ReturnType<typeof setInterval> | null>(null);

  const bounds = useCallback(
    () => ({ maxX: window.innerWidth - SIZE - MARGIN, maxY: window.innerHeight - SIZE - MARGIN }),
    []
  );

  useEffect(() => {
    const { maxX, maxY } = bounds();
    setPos({ x: maxX, y: maxY - 72 });
    const onResize = () => {
      const b = bounds();
      setPos((p) => (p ? { x: clamp(p.x, b.maxX), y: clamp(p.y, b.maxY) } : p));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [bounds]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      if (typer.current) clearInterval(typer.current);
    },
    []
  );

  const typeInto = useCallback(
    (code: string) => {
      const chunk = Math.max(1, Math.ceil(code.length / TYPE_STEPS));
      let shown = 0;
      setPhase('typing');
      typer.current = setInterval(() => {
        shown = Math.min(code.length, shown + chunk);
        onSolution(code.slice(0, shown));
        if (shown >= code.length) {
          if (typer.current) clearInterval(typer.current);
          setPhase('done');
          timers.current.push(setTimeout(() => setPhase('idle'), 1500));
        }
      }, TYPE_MS);
    },
    [onSolution]
  );

  const solve = useCallback(async () => {
    if (phase !== 'idle') return;
    setError(null);
    setPhase('thinking');
    try {
      const [res] = await Promise.all([
        apiClient.get<{ code: string }>(
          `/coding/problems/${encodeURIComponent(problemId)}/demo-solution?language=${language}`
        ),
        new Promise((resolve) => timers.current.push(setTimeout(resolve, THINK_MS))),
      ]);
      typeInto(res.code);
    } catch (err) {
      setPhase('idle');
      setError(err instanceof Error ? err.message : 'AI solve unavailable');
      timers.current.push(setTimeout(() => setError(null), 3500));
    }
  }, [phase, problemId, language, typeInto]);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { active: true, moved: false, startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    d.moved = true;
    const { maxX, maxY } = bounds();
    setPos({ x: clamp(d.originX + dx, maxX), y: clamp(d.originY + dy, maxY) });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const wasDrag = drag.current.moved;
    drag.current.active = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (!wasDrag) void solve();
  };

  if (!pos) return null;

  const busy = phase === 'thinking' || phase === 'typing';
  const label = error ?? (busy ? 'AI is writing the solution…' : 'AI Solve (demo) — click to fill the editor, drag to move');

  return (
    <div className="fixed z-[60] touch-none select-none" style={{ left: pos.x, top: pos.y }}>
      {error && (
        <div className="absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
          {error}
        </div>
      )}
      <button
        type="button"
        aria-label={label}
        title={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current.active = false)}
        style={{ width: SIZE, height: SIZE }}
        className={`flex items-center justify-center rounded-full border text-white shadow-xl shadow-black/40 transition-colors cursor-grab active:cursor-grabbing ${
          phase === 'done'
            ? 'border-emerald-300 bg-emerald-500'
            : 'border-orange-300/60 bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400'
        }`}
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : phase === 'done' ? (
          <Check className="h-6 w-6 stroke-[3]" />
        ) : (
          <Sparkles className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}
