import { describe, expect, it, vi } from 'vitest';
import { MicCapture, type CapturedUtterance, type MicCaptureDeps, type RecorderLike } from './micCapture';

const STEP = 40;
const SPEECH = 0.15;
const QUIET = 0.002;

class FakeRecorder implements RecorderLike {
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  started = false;
  stopped = false;
  constructor(readonly payload: string) {}
  start() {
    this.started = true;
  }
  stop() {
    this.stopped = true;
    this.ondataavailable?.({ data: new Blob([this.payload]) });
    queueMicrotask(() => this.onstop?.());
  }
}

function harness(opts: { supported?: boolean; streamError?: string; payload?: string } = {}) {
  const clock = { t: 0, rms: QUIET };
  const recorders: FakeRecorder[] = [];
  let tick: (() => void) | null = null;
  const track = { stop: vi.fn(), endedHandler: null as (() => void) | null, addEventListener(_t: string, fn: () => void) { this.endedHandler = fn; } };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream;
  const analyserClosed = vi.fn();

  const deps: MicCaptureDeps = {
    recordingSupported: () => opts.supported ?? true,
    getAudioStream: async () => {
      if (opts.streamError) throw Object.assign(new Error('x'), { name: opts.streamError });
      return stream;
    },
    pickMimeType: () => 'audio/webm;codecs=opus',
    createAnalyser: () => ({ readRms: () => clock.rms, close: analyserClosed }),
    createRecorder: () => {
      const r = new FakeRecorder(opts.payload ?? `clip-${recorders.length}`);
      recorders.push(r);
      return r;
    },
    now: () => clock.t,
    setInterval: (fn) => {
      tick = fn;
      return 1;
    },
    clearInterval: () => {
      tick = null;
    },
  };

  const utterances: CapturedUtterance[] = [];
  const handlers = { onUtterance: vi.fn((u: CapturedUtterance) => utterances.push(u)), onBargeIn: vi.fn(), onError: vi.fn() };
  const capture = new MicCapture(deps, handlers);

  async function advance(ms: number, rms: number) {
    clock.rms = rms;
    for (let e = 0; e < ms; e += STEP) {
      clock.t += STEP;
      tick?.();
    }
    for (let i = 0; i < 6; i++) await Promise.resolve();
  }
  const running = () => recorders.filter((r) => r.started && !r.stopped);

  return { capture, handlers, utterances, advance, recorders, running, track, analyserClosed, hasTimer: () => tick !== null };
}

describe('MicCapture: setup failures', () => {
  it('reports an unsupported browser', async () => {
    const h = harness({ supported: false });
    expect(await h.capture.start()).toBe(false);
    expect(h.handlers.onError).toHaveBeenCalledWith('unsupported');
  });

  it.each([
    ['NotAllowedError', 'denied'],
    ['SecurityError', 'denied'],
    ['NotFoundError', 'no-device'],
    ['OverconstrainedError', 'no-device'],
  ])('maps %s to %s', async (error, code) => {
    const h = harness({ streamError: error });
    expect(await h.capture.start()).toBe(false);
    expect(h.handlers.onError).toHaveBeenCalledWith(code);
  });

  it('releases the stream when stopped while the permission prompt was still open', async () => {
    const h = harness();
    const starting = h.capture.start();
    h.capture.stop();
    expect(await starting).toBe(false);
    expect(h.track.stop).toHaveBeenCalled();
    expect(h.hasTimer()).toBe(false);
  });

  it('reports a disconnected microphone', async () => {
    const h = harness();
    await h.capture.start();
    h.track.endedHandler?.();
    expect(h.handlers.onError).toHaveBeenCalledWith('lost');
  });
});

describe('MicCapture: capturing answers', () => {
  async function listening() {
    const h = harness();
    h.capture.setListening(true); // before start() resolves, like the React effect order
    await h.capture.start();
    return h;
  }

  it('records one clip per spoken answer, with the whole sentence', async () => {
    const h = await listening();
    await h.advance(500, QUIET);
    await h.advance(2_500, SPEECH);
    await h.advance(2_000, QUIET);

    expect(h.utterances).toHaveLength(1);
    const u = h.utterances[0];
    expect(u.mime).toBe('audio/webm;codecs=opus');
    expect(u.blob.size).toBeGreaterThan(0);
    expect(u.speechMs).toBeGreaterThan(2_300);
    expect(await u.blob.text()).toBe('clip-0'); // the recorder that ran since listening began: nothing clipped
  });

  it('keeps listening after an answer (a fresh recorder is already running)', async () => {
    const h = await listening();
    await h.advance(2_000, SPEECH);
    await h.advance(2_000, QUIET);
    expect(h.running()).toHaveLength(1);

    await h.advance(2_000, SPEECH);
    await h.advance(2_000, QUIET);
    expect(h.utterances).toHaveLength(2);
    expect(await h.utterances[1].blob.text()).toBe('clip-1');
  });

  it('sends nothing for silence, and recycles the idle recorder so uploads never carry long silence', async () => {
    const h = await listening();
    await h.advance(30_000, QUIET);
    expect(h.utterances).toEqual([]);
    expect(h.recorders.length).toBeGreaterThanOrEqual(5);
    expect(h.running()).toHaveLength(1);
  });

  it('drops a cough or click', async () => {
    const h = await listening();
    await h.advance(250, SPEECH);
    await h.advance(3_000, QUIET);
    expect(h.utterances).toEqual([]);
    expect(h.running()).toHaveLength(1);
  });

  it('does not deliver an empty recording', async () => {
    const h = harness({ payload: '' });
    h.capture.setListening(true);
    await h.capture.start();
    await h.advance(2_000, SPEECH);
    await h.advance(2_000, QUIET);
    expect(h.utterances).toEqual([]);
  });

  it('ignores the mic entirely while not listening, and resumes cleanly', async () => {
    const h = await listening();
    h.capture.setListening(false);
    expect(h.running()).toHaveLength(0);
    await h.advance(3_000, SPEECH);
    await h.advance(3_000, QUIET);
    expect(h.utterances).toEqual([]);

    h.capture.setListening(true);
    expect(h.running()).toHaveLength(1);
    await h.advance(2_000, SPEECH);
    await h.advance(2_000, QUIET);
    expect(h.utterances).toHaveLength(1);
  });
});

describe('MicCapture: barge-in', () => {
  it('interrupts the AI once for sustained speech, then still captures the answer', async () => {
    const h = harness();
    h.capture.setListening(true);
    await h.capture.start();
    h.capture.setAiSpeaking(true);

    await h.advance(2_000, 0.3);
    expect(h.handlers.onBargeIn).toHaveBeenCalledTimes(1);

    h.capture.setAiSpeaking(false);
    await h.advance(1_000, 0.15);
    await h.advance(2_000, QUIET);
    expect(h.utterances).toHaveLength(1);
  });

  it('does not interrupt for speaker echo while the AI talks', async () => {
    const h = harness();
    h.capture.setListening(true);
    await h.capture.start();
    h.capture.setAiSpeaking(true);
    await h.advance(10_000, 0.04);
    expect(h.handlers.onBargeIn).not.toHaveBeenCalled();
    expect(h.utterances).toEqual([]);
  });
});

describe('MicCapture: shutdown', () => {
  it('stops everything: timer, recorder, analyser and the mic tracks', async () => {
    const h = harness();
    h.capture.setListening(true);
    await h.capture.start();
    h.capture.stop();

    expect(h.hasTimer()).toBe(false);
    expect(h.running()).toHaveLength(0);
    expect(h.analyserClosed).toHaveBeenCalled();
    expect(h.track.stop).toHaveBeenCalled();
  });
});
