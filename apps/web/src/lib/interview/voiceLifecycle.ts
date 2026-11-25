import { stopAudio } from '@/lib/audioManager';

export interface VoiceLifecycle {
  /** False once the session was closed (candidate ended or left). Late callbacks must check this. */
  isAlive(): boolean;
  /** Starts a turn's request, superseding (aborting) any earlier one still in flight. */
  beginTurn(): AbortController;
  /** Silences the agent and permanently ignores everything still in flight. Synchronous. */
  close(): void;
  /** Re-arms after close (React StrictMode runs effect cleanup and then setup again). */
  reopen(): void;
}

/**
 * One interview's voice lifecycle. close() must be the first thing every exit path does, before any
 * await (stopping fullscreen, finishing proctoring, saving results), or the agent keeps talking
 * while those finish and a reply that was still in flight starts speaking after the exit.
 */
export function createVoiceLifecycle(stop: () => void = stopAudio): VoiceLifecycle {
  let alive = true;
  let current: AbortController | null = null;

  return {
    isAlive: () => alive,
    beginTurn() {
      current?.abort();
      current = new AbortController();
      return current;
    },
    close() {
      alive = false;
      current?.abort();
      current = null;
      stop();
    },
    reopen() {
      alive = true;
    },
  };
}
