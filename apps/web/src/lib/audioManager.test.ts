import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class FakeAudio {
  static last: FakeAudio | undefined;
  src = '';
  volume = 1;
  currentTime = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  playResult: Promise<void> = Promise.resolve();
  play = vi.fn(() => this.playResult);
  pause = vi.fn();
  constructor() {
    FakeAudio.last = this;
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

const MP3_URI = `data:audio/mp3;base64,${Buffer.from([0xff, 0xf3, 0x64, 0xc4, 0, 0, 0]).toString('base64')}`;

let synth: { cancel: ReturnType<typeof vi.fn>; speak: ReturnType<typeof vi.fn>; getVoices: () => unknown[]; paused: boolean; resume: ReturnType<typeof vi.fn> };

async function load() {
  vi.resetModules();
  return import('./audioManager');
}

beforeEach(() => {
  FakeAudio.last = undefined;
  synth = { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [], paused: false, resume: vi.fn() };
  vi.stubGlobal('window', { speechSynthesis: synth });
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('playAudio: server TTS audio', () => {
  it('plays the server-generated audio and does not use browser speech', async () => {
    const { playAudio } = await load();
    playAudio('Hello', MP3_URI);

    expect(FakeAudio.last!.play).toHaveBeenCalledTimes(1);
    expect(FakeAudio.last!.src.startsWith('blob:')).toBe(true);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('calls onEnd exactly once when playback finishes', async () => {
    const { playAudio } = await load();
    const onEnd = vi.fn();
    playAudio('Hello', MP3_URI, onEnd);
    FakeAudio.last!.onended?.();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('falls back to browser speech when the audio element errors', async () => {
    const { playAudio } = await load();
    const onEnd = vi.fn();
    playAudio('Fallback text', MP3_URI, onEnd);
    FakeAudio.last!.onerror?.();

    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect((synth.speak.mock.calls[0][0] as FakeUtterance).text).toBe('Fallback text');
    (synth.speak.mock.calls[0][0] as FakeUtterance).onend?.();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('falls back to browser speech when autoplay is blocked', async () => {
    const rejecting = new FakeAudio();
    rejecting.playResult = Promise.reject(new DOMException('blocked', 'NotAllowedError'));
    vi.stubGlobal('Audio', class { constructor() { return rejecting; } });
    const mod = await load();
    mod.playAudio('Blocked', MP3_URI);
    await Promise.resolve();
    await Promise.resolve();

    expect(synth.speak).toHaveBeenCalledTimes(1);
  });
});

describe('playAudio: server TTS unavailable (empty audioUrl)', () => {
  it('speaks the text with browser speech and still advances the turn', async () => {
    const { playAudio } = await load();
    const onEnd = vi.fn();
    playAudio('No server audio', '', onEnd);

    expect(FakeAudio.last).toBeUndefined();
    expect(synth.speak).toHaveBeenCalledTimes(1);
    (synth.speak.mock.calls[0][0] as FakeUtterance).onend?.();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('advances the turn even when speech synthesis does not exist', async () => {
    vi.stubGlobal('window', {});
    const { playAudio } = await load();
    const onEnd = vi.fn();
    playAudio('Silent browser', undefined, onEnd);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});

describe('stopAudio', () => {
  it('suppresses late callbacks so a finished interview cannot restart speech', async () => {
    const { playAudio, stopAudio } = await load();
    const onEnd = vi.fn();
    playAudio('Hello', MP3_URI, onEnd);
    const audio = FakeAudio.last!;
    const ended = audio.onended;
    const errored = audio.onerror;

    stopAudio();
    ended?.();
    errored?.();

    expect(onEnd).not.toHaveBeenCalled();
    expect(synth.speak).not.toHaveBeenCalled();
    expect(audio.pause).toHaveBeenCalled();
    expect(synth.cancel).toHaveBeenCalled();
  });
});

describe('dataUriToBlobUrl', () => {
  it('converts a base64 data URI to a blob URL with the right mime type', async () => {
    const { dataUriToBlobUrl } = await load();
    const url = dataUriToBlobUrl(MP3_URI);
    expect(url.startsWith('blob:')).toBe(true);
    const blob = await (await fetch(url)).blob();
    expect(blob.type).toBe('audio/mp3');
    expect(blob.size).toBe(7);
  });

  it('passes through non-data URLs untouched', async () => {
    const { dataUriToBlobUrl } = await load();
    expect(dataUriToBlobUrl('https://cdn.example/a.mp3')).toBe('https://cdn.example/a.mp3');
  });
});

describe('interruptAudio (candidate talks over the AI)', () => {
  it('delivers onEnd exactly once so the "AI is speaking" state cannot get stuck', async () => {
    const { playAudio, interruptAudio } = await load();
    let isAiSpeaking = true;
    playAudio('Long question', MP3_URI, () => {
      isAiSpeaking = false;
    });

    interruptAudio();

    expect(isAiSpeaking).toBe(false);
    expect(FakeAudio.last!.pause).toHaveBeenCalled();
    // late browser events after the interruption must not re-fire or restart speech
    FakeAudio.last!.onended?.();
    FakeAudio.last!.onerror?.();
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('works for browser-speech playback too', async () => {
    const { playAudio, interruptAudio } = await load();
    const onEnd = vi.fn();
    playAudio('Spoken by the browser', undefined, onEnd);
    interruptAudio();
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(synth.cancel).toHaveBeenCalled();
  });

  it('is a safe no-op when nothing is playing, and never double-fires', async () => {
    const { playAudio, interruptAudio } = await load();
    expect(() => interruptAudio()).not.toThrow();

    const onEnd = vi.fn();
    playAudio('Hello', MP3_URI, onEnd);
    FakeAudio.last!.onended?.();
    interruptAudio();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('a new clip after an interruption completes normally (a full turn cycle)', async () => {
    const { playAudio, interruptAudio } = await load();
    const first = vi.fn();
    const second = vi.fn();
    playAudio('Q1', MP3_URI, first);
    interruptAudio();
    playAudio('Q2', MP3_URI, second);
    FakeAudio.last!.onended?.();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('stopAudio (navigation/teardown) still never fires the callback', async () => {
    const { playAudio, stopAudio } = await load();
    const onEnd = vi.fn();
    playAudio('Hello', MP3_URI, onEnd);
    stopAudio();
    expect(onEnd).not.toHaveBeenCalled();
  });
});

