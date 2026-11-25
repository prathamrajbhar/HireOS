import { describe, expect, it, vi } from 'vitest';
import { createVoiceLifecycle } from './voiceLifecycle';

describe('createVoiceLifecycle', () => {
  it('starts alive', () => {
    expect(createVoiceLifecycle(vi.fn()).isAlive()).toBe(true);
  });

  it('close() silences synchronously, aborts the in-flight turn and marks the session dead', () => {
    const stop = vi.fn();
    const life = createVoiceLifecycle(stop);
    const turn = life.beginTurn();
    life.close();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(turn.signal.aborted).toBe(true);
    expect(life.isAlive()).toBe(false);
  });

  it('a new turn supersedes (aborts) the previous one', () => {
    const life = createVoiceLifecycle(vi.fn());
    const first = life.beginTurn();
    const second = life.beginTurn();
    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(false);
  });

  it('close() is idempotent and safe with no turn in flight', () => {
    const stop = vi.fn();
    const life = createVoiceLifecycle(stop);
    expect(() => {
      life.close();
      life.close();
    }).not.toThrow();
    expect(life.isAlive()).toBe(false);
  });

  it('reopen() re-arms after a close (React StrictMode remount)', () => {
    const life = createVoiceLifecycle(vi.fn());
    life.close();
    life.reopen();
    expect(life.isAlive()).toBe(true);
    expect(life.beginTurn().signal.aborted).toBe(false);
  });
});
