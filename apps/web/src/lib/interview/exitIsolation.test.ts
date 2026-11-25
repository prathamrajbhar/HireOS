/**
 * End-to-end exit isolation: real streaming client + turn runner + voice player + lifecycle.
 * Only the browser audio and the network are faked.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class FakeAudio {
  static instances: FakeAudio[] = [];
  src = '';
  volume = 1;
  currentTime = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  played: string[] = [];
  paused = false;
  play = vi.fn(() => {
    this.paused = false;
    this.played.push(this.src);
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
  constructor() {
    FakeAudio.instances.push(this);
  }
}
class FakeUtterance {
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  voice: unknown = null;
  rate = 1;
  pitch = 1;
  volume = 1;
  constructor(public text: string) {}
}

const PARAMS = { interviewId: 'i', transcript: 'my answer', turnNumber: 1, stage: 'intro', jobTitle: 'Eng', conversationHistory: [] };
const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
const TURN = sse('turn', { text: 'One. Two. Three.', stage: 'intro', sentences: ['One thing here.', 'Two things here.', 'Three things here.'] });
const AUDIO = (i: number) => sse('audio', { index: i, sentence: `S${i}`, audio: `data:audio/mp3;base64,AA${i}A`, is_final: i === 2 });

let synth: { cancel: ReturnType<typeof vi.fn>; speak: ReturnType<typeof vi.fn>; getVoices: () => unknown[]; paused: boolean; resume: ReturnType<typeof vi.fn> };

function controlledStream(honorAbort: boolean) {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({ start: (c) => void (controller = c) });
  return {
    response: new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    send: (t: string) => { try { controller.enqueue(enc.encode(t)); } catch {} },
    abortHook: (signal?: AbortSignal | null) => {
      if (honorAbort) signal?.addEventListener('abort', () => { try { controller.error(new DOMException('aborted', 'AbortError')); } catch {} });
    },
  };
}

async function build(opts: { honorAbort?: boolean } = {}) {
  vi.resetModules();
  const audio = await import('../audioManager');
  const { voiceStream } = await import('../voiceStream');
  const { createVoiceLifecycle } = await import('./voiceLifecycle');
  const { requestAiTurnStream } = await import('./aiTurnStream');
  const { runAiTurn } = await import('./aiTurn');

  const net = controlledStream(opts.honorAbort ?? true);
  const aborted = { value: false };
  vi.stubGlobal('fetch', vi.fn(async (_u: string, init: RequestInit) => {
    init.signal?.addEventListener('abort', () => (aborted.value = true));
    net.abortHook(init.signal);
    return net.response;
  }));

  const life = createVoiceLifecycle(audio.stopAudio);
  const speaking: boolean[] = [];
  const shown: string[] = [];
  const turnPromise = runAiTurn(PARAMS, life.beginTurn().signal, { onTurn: (t) => shown.push(t.text), onSpeaking: (s) => speaking.push(s) }, { stream: requestAiTurnStream, voice: voiceStream, isAlive: life.isAlive });
  const el = () => FakeAudio.instances[0];
  const settle = async () => { for (let i = 0; i < 12; i++) await new Promise((r) => setTimeout(r, 0)); };
  return { net, life, speaking, shown, turnPromise, el, settle, aborted, audio, voiceStream, runAiTurn, requestAiTurnStream };
}

beforeEach(() => {
  FakeAudio.instances = [];
  synth = { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [], paused: false, resume: vi.fn() };
  vi.stubGlobal('window', { speechSynthesis: synth });
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('streamed reply, normal flow', () => {
  it('plays sentence 1 while the stream is still open, then the rest in order, and the agent finishes speaking', async () => {
    const t = await build();
    t.net.send(TURN + AUDIO(0));
    await t.settle();
    expect(t.shown).toEqual(['One. Two. Three.']);
    expect(t.el().played).toHaveLength(1); // audible before the stream has finished

    t.net.send(AUDIO(1) + AUDIO(2) + sse('done', {}));
    await t.settle();
    t.el().onended?.();
    t.el().onended?.();
    t.el().onended?.();
    expect(await t.turnPromise).toBe('completed');
    expect(t.el().played).toHaveLength(3);
    expect(t.speaking).toEqual([true, false]);
  });
});

describe('EXIT: the agent goes quiet and stays quiet', () => {
  it('silences the sentence that is playing in the same tick as close(), and drops every later sentence', async () => {
    const t = await build();
    t.net.send(TURN + AUDIO(0));
    await t.settle();
    expect(t.el().paused).toBe(false);

    t.life.close(); // candidate pressed End — synchronous, no await
    expect(t.el().paused).toBe(true);
    expect(synth.cancel).toHaveBeenCalled();

    t.net.send(AUDIO(1) + AUDIO(2) + sse('done', {})); // the server keeps sending
    await t.settle();
    expect(t.el().played).toHaveLength(1);
    expect(await t.turnPromise).toBe('cancelled');
    expect(t.aborted.value).toBe(true); // the request is cancelled so the server stops synthesizing
    expect(t.speaking).not.toContain(false); // no state updates after the session is gone
  });

  it('a reply that lands after exit never plays or shows, even if the network ignores the abort', async () => {
    const t = await build({ honorAbort: false });
    t.life.close(); // exit while the LLM was still thinking
    t.net.send(TURN + AUDIO(0) + AUDIO(1) + AUDIO(2) + sse('done', {}));
    await t.settle();

    expect(t.shown).toEqual([]);
    expect(FakeAudio.instances.every((a) => a.played.length === 0)).toBe(true);
    expect(synth.speak).not.toHaveBeenCalled();
    expect(await t.turnPromise).toBe('cancelled');
  });

  it('exit during a browser-voice fallback sentence stops the speech and does not continue', async () => {
    const t = await build();
    t.net.send(sse('turn', { text: 'Fallback reply here.', sentences: ['Fallback reply here.', 'Second sentence here.'] }) + sse('audio', { index: 0, sentence: 'Fallback reply here.', audio: '' }));
    await t.settle();
    expect(synth.speak).toHaveBeenCalledTimes(1);

    t.life.close();
    expect(synth.cancel).toHaveBeenCalled();
    (synth.speak.mock.calls[0][0] as FakeUtterance).onend?.(); // browsers still fire onend for cancelled speech
    t.net.send(sse('audio', { index: 1, sentence: 'Second sentence here.', audio: '' }) + sse('done', {}));
    await t.settle();
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it('is safe to close twice and to close with nothing playing', async () => {
    const t = await build();
    t.life.close();
    expect(() => t.life.close()).not.toThrow();
  });

  it('after a close, a fresh session can speak again (remount / next interview)', async () => {
    const t = await build();
    t.life.close();
    t.life.reopen();

    const handle = t.voiceStream.open(vi.fn());
    handle.push({ sentence: 'Hello again.', audio: 'data:audio/mp3;base64,AAAA' });
    expect(t.el().played.length).toBeGreaterThan(0);
  });
});

describe('barge-in during a streamed reply', () => {
  it('stops the agent, reports it done speaking, and drops the unplayed sentences', async () => {
    const t = await build();
    t.net.send(TURN + AUDIO(0) + AUDIO(1));
    await t.settle();

    t.audio.interruptAudio(); // the candidate started talking
    expect(t.el().paused).toBe(true);
    expect(t.speaking).toEqual([true, false]);

    t.el().onended?.();
    t.net.send(AUDIO(2) + sse('done', {}));
    await t.settle();
    expect(t.el().played).toHaveLength(1);
  });
});
