'use client';

import { useState, useEffect, useRef } from 'react';

export interface UseAssessmentTimerOptions {
  expiresAt?: string | null;
  isStarted?: boolean;
  durationSeconds?: number;
  onExpire?: () => void;
}

export interface UseAssessmentTimerReturn {
  formattedTime: string;
  timeRemainingMs: number;
  totalSeconds: number;
  isExpired: boolean;
  isWarning: boolean; // true when less than 5 minutes remaining
}

export function useAssessmentTimer({
  expiresAt,
  isStarted = false,
  durationSeconds = 1800,
  onExpire,
}: UseAssessmentTimerOptions): UseAssessmentTimerReturn {
  const initialDurationMs = durationSeconds * 1000;

  const computeRemainingMs = (): number => {
    if (!isStarted || !expiresAt) {
      return initialDurationMs;
    }
    const expiresMs = new Date(expiresAt).getTime();
    if (isNaN(expiresMs)) {
      return initialDurationMs;
    }
    return Math.max(0, expiresMs - Date.now());
  };

  const [timeRemainingMs, setTimeRemainingMs] = useState<number>(computeRemainingMs);
  const [isExpired, setIsExpired] = useState<boolean>(() => {
    if (!isStarted || !expiresAt) return false;
    const expiresMs = new Date(expiresAt).getTime();
    return !isNaN(expiresMs) && Date.now() >= expiresMs;
  });

  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const expiredHandledRef = useRef(isExpired);

  useEffect(() => {
    if (!isStarted || !expiresAt) {
      setTimeRemainingMs(initialDurationMs);
      setIsExpired(false);
      expiredHandledRef.current = false;
      return;
    }

    const expiresMs = new Date(expiresAt).getTime();
    if (isNaN(expiresMs)) return;

    const tick = () => {
      const remaining = expiresMs - Date.now();
      if (remaining <= 0) {
        setTimeRemainingMs(0);
        setIsExpired(true);
        if (!expiredHandledRef.current) {
          expiredHandledRef.current = true;
          onExpireRef.current?.();
        }
      } else {
        setTimeRemainingMs(remaining);
      }
    };

    tick();
    const timerId = setInterval(tick, 1000);
    return () => clearInterval(timerId);
  }, [expiresAt, isStarted, initialDurationMs]);

  const totalSeconds = Math.max(0, Math.floor(timeRemainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formattedTime =
    hours > 0
      ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isWarning = isStarted && !isExpired && totalSeconds > 0 && totalSeconds < 300; // < 5 mins

  return {
    formattedTime,
    timeRemainingMs,
    totalSeconds,
    isExpired,
    isWarning,
  };
}
