import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class FakeAudio {
  static instances: FakeAudio[] = [];
  src = '';
  volume = 1;
  currentTime = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  playResult: Promise<void> = Promise.resolve();
  played: string[] = [];
  play = vi.fn(() => {
    this.played.push(this.src);
    return this.playResult;
  });
  pause = vi.fn();
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

const uri = (n: number) => `data:audio/mp3;base64,${Buffer.from([0xff, 0xf3, n]).toString('base64')}`;
const chunk = (n: number) => ({ sentence: `Sentence ${n}.`, audio: uri(n) });

let synth: { cancel: ReturnType<typeof vi.fn>; speak: ReturnType<typeof vi.fn>; getVoices: () => unknown[]; paused: boolean; resume: ReturnType<typeof vi.fn> };
let revoked: string[];

async function load() {
  vi.resetModules();
  const audio = await import('./audioManager');
  const stream = await import('./voiceStream');
  return { ...audio, ...stream };
}
const el = () => FakeAudio.instances[0];
const spoken = () => synth.speak.mock.calls.map((c) => (c[0] as FakeUtterance).text);
const finishSpeech = (i = synth.speak.mock.calls.length - 1) => (synth.speak.mock.calls[i][0] as FakeUtterance).onend?.();

beforeEach(() => {
  FakeAudio.instances = [];
  revoked = [];
  synth = { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [], paused: false, resume: vi.fn() };
  vi.stubGlobal('window', { speechSynthesis: synth });
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  const realRevoke = URL.revokeObjectURL.bind(URL);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation((u) => {
    revoked.push(u);
    realRevoke(u);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('voiceStream: playback', () => {
  it('starts speaking the first sentence immediately, before later ones have arrived', async () => {
    const { voiceStream } = await load();
    const h = voiceStream.open(vi.fn());
    h.push(chunk(1));
    expect(el().play).toHaveBeenCalledTimes(1);
    expect(el().src.startsWith('blob:')).toBe(true);

    h.push(chunk(2)); // arrives while sentence 1 is playing
    expect(el().play).toHaveBeenCalledTimes(1);
  });

  it('plays sentences strictly in order, one after another', async () => {
    const { voiceStream } = await load();
    const h = voiceStream.open(vi.fn());
    h.push(chunk(1));
    h.push(chunk(2));
    h.push(chunk(3));
    const urls: string[] = [];
    for (let i = 0; i < 3; i++) {
      urls.push(el().src);
      el().onended?.();
    }
    expect(el().played).toHaveLength(3);
    expect(new Set(urls).size).toBe(3);
  });

  it('calls onEnd exactly once, only after end() and the last sentence finished', async () => {
    const { voiceStream } = await load();
    const onEnd = vi.fn();
    const h = voiceStream.open(onEnd);
    h.push(chunk(1));
    el().onended?.();
    expect(onEnd).not.toHaveBeenCalled(); // more might still arrive

    h.push(chunk(2));
    h.end();
    expect(onEnd).not.toHaveBeenCalled(); // sentence 2 still playing
    el().onended?.();
    expect(onEnd).toHaveBeenCalledTimes(1);
    el().onended?.();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('finishes immediately when the stream ends with nothing to say', async () => {
    const { voiceStream } = await load();
    const onEnd = vi.fn();
    voiceStream.open(onEnd).end();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('ignores chunks pushed after end()', async () => {
    const { voiceStream } = await load();
    const h = voiceStream.open(vi.fn());
    h.end();
    h.push(chunk(1));
    expect(FakeAudio.instances.length === 0 || el().play.mock.calls.length === 0).toBe(true);
  });

  it('releases each sentence blob URL once it has been played', async () => {
    const { voiceStream } = await load();
    const h = voiceStream.open(vi.fn());
    h.push(chunk(1));
    const first = el().src;
    el().onended?.();
    expect(revoked).toContain(first);
  });
});

describe('voiceStream: per-sentence fallback to the browser voice', () => {
  it('speaks a sentence with no audio using browser speech, then carries on', async () => {
    const { voiceStream } = await load();
    const onEnd = vi.fn();
    const h = voiceStream.open(onEnd);
    h.push({ sentence: 'No server audio here.', audio: '' });
    h.push(chunk(2));
    expect(spoken()).toEqual(['No server audio here.']);
    expect(FakeAudio.instances.length === 0 || el().play.mock.calls.length === 0).toBe(true);

    finishSpeech();
    expect(el().play).toHaveBeenCalledTimes(1);
    h.end();
    el().onended?.();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('falls back when an audio element errors', async () => {
    const { voiceStream } = await load();
    const h = voiceStream.open(vi.fn());
    h.push(chunk(1));
    el().onerror?.();
    expect(spoken()).toEqual(['Sentence 1.']);
  });

  it('falls back when autoplay is blocked', async () => {
    vi.stubGlobal('Audio', class extends FakeAudio {
      playResult = Promise.reject(new DOMException('blocked', 'NotAllowedError'));
    });
    const { voiceStream } = await load();
    voiceStream.open(vi.fn()).push(chunk(1));
    await Promise.resolve();
    await Promise.resolve();
    expect(spoken()).toEqual(['Sentence 1.']);
  });

  it('does not speak the sentence twice if both an error and a rejection happen', async () => {
    const { voiceStream } = await load();
    const h = voiceStream.open(vi.fn());
    h.push(chunk(1));
    el().onerror?.();
    el().onerror?.();
    expect(spoken()).toEqual(['Sentence 1.']);
  });
});

describe('voiceStream: diagnostics (silent fallbacks must explain themselves)', () => {
  it('says why a sentence fell back, and warns when the browser has no voices', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { voiceStream } = await load();
    voiceStream.open(vi.fn()).push({ sentence: 'No audio.', audio: '' });
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages.some((m) => /server sent no audio/.test(m))).toBe(true);
    expect(messages.some((m) => /no speech voices/.test(m))).toBe(true);
  });

  it('names an autoplay block so it is not mistaken for a server problem', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('Audio', class extends FakeAudio {
      playResult = Promise.reject(new DOMException('blocked', 'NotAllowedError'));
    });
    const { voiceStream } = await load();
    voiceStream.open(vi.fn()).push(chunk(1));
    await Promise.resolve();
    await Promise.resolve();
    expect(warn.mock.calls.some((c) => /blocked autoplay/.test(String(c[0])))).toBe(true);
  });

  it('stays quiet when playback works', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { voiceStream } = await load();
    voiceStream.open(vi.fn()).push(chunk(1));
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('voiceStream: exit isolation', () => {
  it('cancel() silences immediately, never calls onEnd, and ignores later chunks and events', async () => {
    const { voiceStream } = await load();
    const onEnd = vi.fn();
    const h = voiceStream.open(onEnd);
    h.push(chunk(1));
    const audio = el();
    const ended = audio.onended;

    h.cancel();
    expect(audio.pause).toHaveBeenCalled();
    expect(synth.cancel).toHaveBeenCalled();

    ended?.();
    h.push(chunk(2));
    h.end();
    expect(onEnd).not.toHaveBeenCalled();
    expect(audio.play).toHaveBeenCalledTimes(1); // chunk 2 never played
  });

  it('stopAudio() stops an active stream silently (navigation / teardown)', async () => {
    const { voiceStream, stopAudio } = await load();
    const onEnd = vi.fn();
    const h = voiceStream.open(onEnd);
    h.push(chunk(1));
    stopAudio();
    h.push(chunk(2));
    el().onended?.();
    expect(onEnd).not.toHaveBeenCalled();
    expect(el().play).toHaveBeenCalledTimes(1);
  });

  it('a late chunk from a stopped session can never start playing', async () => {
    const { voiceStream, stopAudio } = await load();
    const h = voiceStream.open(vi.fn());
    stopAudio();
    h.push(chunk(1));
    h.push({ sentence: 'late', audio: '' });
    expect(spoken()).toEqual([]);
    expect(FakeAudio.instances.length === 0 || el().play.mock.calls.length === 0).toBe(true);
  });

  it('opening a new stream silences the previous one without calling its onEnd', async () => {
    const { voiceStream } = await load();
    const first = vi.fn();
    const second = vi.fn();
    const a = voiceStream.open(first);
    a.push(chunk(1));
    const b = voiceStream.open(second);
    a.push(chunk(9));
    b.push(chunk(2));
    b.end();
    el().onended?.();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('speech callbacks after a stop do not resurrect the stream', async () => {
    const { voiceStream, stopAudio } = await load();
    const onEnd = vi.fn();
    const h = voiceStream.open(onEnd);
    h.push({ sentence: 'Browser spoken.', audio: '' });
    h.push(chunk(2));
    stopAudio();
    finishSpeech(0); // browsers fire onend/onerror for cancelled utterances
    expect(el()?.play.mock.calls.length ?? 0).toBe(0);
    expect(onEnd).not.toHaveBeenCalled();
  });
});

describe('voiceStream: barge-in (interruptAudio)', () => {
  it('stops the AI mid-sentence and delivers onEnd exactly once so the answer can be submitted', async () => {
    const { voiceStream, interruptAudio } = await load();
    const onEnd = vi.fn();
    const h = voiceStream.open(onEnd);
    h.push(chunk(1));
    h.push(chunk(2));

    interruptAudio();
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(el().pause).toHaveBeenCalled();

    el().onended?.();
    h.push(chunk(3));
    h.end();
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(el().play).toHaveBeenCalledTimes(1);
  });

  it('is a safe no-op when nothing is playing', async () => {
    const { interruptAudio } = await load();
    expect(() => interruptAudio()).not.toThrow();
  });
});

describe('voiceStream and legacy playAudio do not overlap', () => {
  it('playAudio() cancels an active stream', async () => {
    const { voiceStream, playAudio } = await load();
    const onEnd = vi.fn();
    const h = voiceStream.open(onEnd);
    h.push(chunk(1));
    playAudio('One shot', uri(7));
    h.push(chunk(2));
    expect(onEnd).not.toHaveBeenCalled();
    expect(el().played.filter(Boolean)).toHaveLength(2); // stream chunk 1, then the one-shot; never chunk 2
  });
});
