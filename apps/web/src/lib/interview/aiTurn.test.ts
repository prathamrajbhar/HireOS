import { describe, expect, it, vi } from 'vitest';
import { runAiTurn, type TurnCallbacks, type TurnDeps } from './aiTurn';
import type { AiAudioChunk, AiStreamResult, AiTurn } from './aiTurnStream';

const PARAMS = { interviewId: 'i', transcript: 't', turnNumber: 1, stage: 'intro', jobTitle: 'Eng', conversationHistory: [] };
const TURN: AiTurn = { text: 'One. Two. Three.', sentences: ['One thing here.', 'Two things here.', 'Three things here.'] };
const chunk = (i: number): AiAudioChunk => ({ index: i, sentence: TURN.sentences[i], audio: `a${i}` });

function setup(script: (h: { onTurn: (t: AiTurn) => void; onAudio: (c: AiAudioChunk) => void; signal?: AbortSignal }) => Promise<AiStreamResult> | AiStreamResult, alive = { value: true }) {
  const handle = { push: vi.fn(), end: vi.fn(), cancel: vi.fn() };
  let onEnd: () => void = () => {};
  const callbacks: TurnCallbacks = { onTurn: vi.fn(), onSpeaking: vi.fn() };
  const deps: TurnDeps = {
    stream: vi.fn(async (_p, h) => script(h)) as unknown as TurnDeps['stream'],
    voice: { open: vi.fn((cb: () => void) => { onEnd = cb; return handle; }) },
    isAlive: () => alive.value,
  };
  const ctrl = new AbortController();
  return { handle, callbacks, deps, ctrl, alive, run: () => runAiTurn(PARAMS, ctrl.signal, callbacks, deps), finishSpeaking: () => onEnd() };
}

describe('runAiTurn', () => {
  it('shows the text, opens the voice stream, pushes each sentence, then ends it', async () => {
    const t = setup(async (h) => {
      h.onTurn(TURN);
      h.onAudio(chunk(0));
      h.onAudio(chunk(1));
      h.onAudio(chunk(2));
      return { status: 'complete', received: 3 };
    });
    expect(await t.run()).toBe('completed');
    expect(t.callbacks.onTurn).toHaveBeenCalledWith(TURN);
    expect(t.callbacks.onSpeaking).toHaveBeenCalledWith(true);
    expect(t.handle.push.mock.calls.map((c) => c[0].audio)).toEqual(['a0', 'a1', 'a2']);
    expect(t.handle.end).toHaveBeenCalledTimes(1);
    expect(t.handle.cancel).not.toHaveBeenCalled();
  });

  it('reports the agent as no longer speaking when the voice finishes', async () => {
    const t = setup(async (h) => {
      h.onTurn(TURN);
      return { status: 'complete', received: 0 };
    });
    await t.run();
    t.finishSpeaking();
    expect(t.callbacks.onSpeaking).toHaveBeenLastCalledWith(false);
  });

  it('EXIT: a reply that arrives after the session closed shows nothing and never speaks', async () => {
    const t = setup(async (h) => {
      t.alive.value = false; // candidate ended while the LLM was still thinking
      h.onTurn(TURN);
      h.onAudio(chunk(0));
      return { status: 'complete', received: 1 };
    });
    expect(await t.run()).toBe('cancelled');
    expect(t.callbacks.onTurn).not.toHaveBeenCalled();
    expect(t.callbacks.onSpeaking).not.toHaveBeenCalled();
    expect(t.deps.voice.open).not.toHaveBeenCalled();
  });

  it('EXIT: closing mid-reply stops pushing sentences and cancels the voice', async () => {
    const t = setup(async (h) => {
      h.onTurn(TURN);
      h.onAudio(chunk(0));
      t.alive.value = false; // exit while sentence 1 is playing
      h.onAudio(chunk(1));
      h.onAudio(chunk(2));
      return { status: 'complete', received: 3 };
    });
    expect(await t.run()).toBe('cancelled');
    expect(t.handle.push).toHaveBeenCalledTimes(1);
    expect(t.handle.cancel).toHaveBeenCalledTimes(1);
    expect(t.handle.end).not.toHaveBeenCalled();
  });

  it('EXIT: an aborted request cancels the voice and does not touch state after the session is gone', async () => {
    const t = setup(async (h) => {
      h.onTurn(TURN);
      t.alive.value = false;
      return { status: 'aborted', received: 0 };
    });
    expect(await t.run()).toBe('cancelled');
    expect(t.handle.cancel).toHaveBeenCalled();
    expect(t.callbacks.onSpeaking).not.toHaveBeenCalledWith(false); // unmounted: no state updates
  });

  it('a turn superseded while the session is still alive resets the speaking state', async () => {
    const t = setup(async (h) => {
      h.onTurn(TURN);
      return { status: 'aborted', received: 0 };
    });
    expect(await t.run()).toBe('cancelled');
    expect(t.callbacks.onSpeaking).toHaveBeenLastCalledWith(false);
  });

  it('ignores audio for a signal that was aborted even if the session flag is still true', async () => {
    const t = setup(async (h) => {
      h.onTurn(TURN);
      t.ctrl.abort();
      h.onAudio(chunk(0));
      return { status: 'complete', received: 1 };
    });
    await t.run();
    expect(t.handle.push).not.toHaveBeenCalled();
  });

  it('speaks the unsent remainder with the browser voice when the audio stream breaks', async () => {
    const t = setup(async (h) => {
      h.onTurn(TURN);
      h.onAudio(chunk(0));
      return { status: 'interrupted', received: 1 };
    });
    expect(await t.run()).toBe('completed');
    expect(t.handle.push.mock.calls.map((c) => c[0])).toEqual([
      { sentence: TURN.sentences[0], audio: 'a0' },
      { sentence: TURN.sentences[1], audio: '' },
      { sentence: TURN.sentences[2], audio: '' },
    ]);
    expect(t.handle.end).toHaveBeenCalled();
  });

  it('propagates a failure that happens before any reply, without opening a voice stream', async () => {
    const t = setup(async () => {
      throw new Error('AI respond failed: 503');
    });
    await expect(t.run()).rejects.toThrow('503');
    expect(t.deps.voice.open).not.toHaveBeenCalled();
  });
});
