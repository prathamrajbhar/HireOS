import { useCallback, useRef } from 'react';

/** Returns a reporter that forwards each distinct message to `onReport` only once per session. */
export function useReportOnce(onReport?: (message: string) => void) {
  const reported = useRef<Set<string>>(new Set());
  return useCallback(
    (message: string | null) => {
      if (!message || reported.current.has(message)) return;
      reported.current.add(message);
      onReport?.(message);
    },
    [onReport]
  );
}
