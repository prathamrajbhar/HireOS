import { describe, expect, it } from 'vitest';
import { DEFAULT_VAD_CONFIG, VoiceActivityDetector, type VadEvent } from './voiceActivity';

const STEP = 40;
const SPEECH = 0.12;
const QUIET = 0.003;

/** Feeds `ms` of constant loudness at 40ms steps; returns events with the time they fired. */
function feed(vad: VoiceActivityDetector, state: { t: number }, rms: number, ms: number, aiSpeaking = false) {
  const events: (VadEvent & { at: number })[] = [];
  for (let elapsed = 0; elapsed < ms; elapsed += STEP) {
    state.t += STEP;
    events.push(...vad.push(rms, state.t, aiSpeaking).map((e) => ({ ...e, at: state.t })));
  }
  return events;
}

const types = (events: VadEvent[]) => events.map((e) => e.type);

describe('VoiceActivityDetector', () => {
  it('ignores silence and background noise indefinitely', () => {
    const vad = new VoiceActivityDetector();
    const clock = { t: 0 };
    expect(feed(vad, clock, QUIET, 30_000)).toEqual([]);
    expect(feed(vad, clock, 0.01, 5_000)).toEqual([]); // below the absolute threshold
  });

  it('starts speech only after it is sustained, not on a single loud frame', () => {
    const vad = new VoiceActivityDetector();
    const clock = { t: 0 };
    expect(feed(vad, clock, SPEECH, STEP)).toEqual([]);
    feed(vad, clock, QUIET, 200);
    expect(vad.speaking).toBe(false);
    expect(types(feed(vad, clock, SPEECH, 300))).toEqual(['speech-start']);
    expect(vad.speaking).toBe(true);
  });

  it('ends the utterance after the end-silence window and reports the speaking time', () => {
    const vad = new VoiceActivityDetector();
    const clock = { t: 0 };
    feed(vad, clock, SPEECH, 2_000);
    const events = feed(vad, clock, QUIET, 3_000);
    const end = events.find((e) => e.type === 'speech-end');
    expect(end).toMatchObject({ type: 'speech-end', forced: false });
    expect((end as { speechMs: number }).speechMs).toBeGreaterThanOrEqual(1_900);
    expect((end as { speechMs: number }).speechMs).toBeLessThanOrEqual(2_100);
    expect(vad.speaking).toBe(false);
  });

  it('does not cut the answer on a short mid-sentence pause', () => {
    const vad = new VoiceActivityDetector();
    const clock = { t: 0 };
    feed(vad, clock, SPEECH, 1_500);
    expect(types(feed(vad, clock, QUIET, DEFAULT_VAD_CONFIG.endSilenceMs - 200))).toEqual([]);
    feed(vad, clock, SPEECH, 1_000);
    expect(vad.speaking).toBe(true);
    expect(types(feed(vad, clock, QUIET, 2_000))).toEqual(['speech-end']);
  });

  it('discards clicks and coughs shorter than the minimum speech length', () => {
    const vad = new VoiceActivityDetector();
    const clock = { t: 0 };
    const events = [...feed(vad, clock, SPEECH, 250), ...feed(vad, clock, QUIET, 2_000)];
    expect(types(events)).toEqual(['speech-start', 'speech-cancel']);
  });

  it('holds on through quiet speech thanks to hysteresis', () => {
    const vad = new VoiceActivityDetector();
    const clock = { t: 0 };
    feed(vad, clock, SPEECH, 1_000);
    const quietTalk = DEFAULT_VAD_CONFIG.absoluteThreshold * 0.8; // under start threshold, over release
    expect(types(feed(vad, clock, quietTalk, 3_000))).toEqual([]);
    expect(vad.speaking).toBe(true);
  });

  it('force-ends an endless utterance at the maximum length', () => {
    const vad = new VoiceActivityDetector({ ...DEFAULT_VAD_CONFIG, maxUtteranceMs: 5_000 });
    const clock = { t: 0 };
    const events = feed(vad, clock, SPEECH, 8_000);
    expect(events.find((e) => e.type === 'speech-end')).toMatchObject({ forced: true });
  });

  it('adapts to a noisy room instead of treating the noise as speech', () => {
    const vad = new VoiceActivityDetector();
    const clock = { t: 0 };
    feed(vad, clock, 0.012, 20_000); // fan noise just under the absolute threshold
    expect(vad.noiseFloor).toBeGreaterThan(0.01);
    // speech must now clear the raised bar, but a clear voice still does
    expect(types(feed(vad, clock, 0.02, 2_000))).toEqual([]);
    expect(types(feed(vad, clock, 0.2, 500))).toEqual(['speech-start']);
  });

  it('can be reset mid-utterance (e.g. while the answer is being processed)', () => {
    const vad = new VoiceActivityDetector();
    const clock = { t: 0 };
    feed(vad, clock, SPEECH, 1_000);
    vad.reset();
    expect(vad.speaking).toBe(false);
    expect(feed(vad, clock, QUIET, 3_000)).toEqual([]);
  });
});

describe('barge-in while the AI is speaking', () => {
  it('ignores moderate sound such as speaker echo', () => {
    const vad = new VoiceActivityDetector();
    const clock = { t: 0 };
    expect(feed(vad, clock, 0.04, 10_000, true)).toEqual([]); // loud enough normally, not while AI talks
  });

  it('ignores a brief loud burst', () => {
    const vad = new VoiceActivityDetector();
    const clock = { t: 0 };
    expect(feed(vad, clock, 0.3, 400, true)).toEqual([]);
  });

  it('fires barge-in only for sustained, clearly louder speech', () => {
    const vad = new VoiceActivityDetector();
    const clock = { t: 0 };
    const events = feed(vad, clock, 0.3, 1_500, true);
    expect(types(events)).toEqual(['speech-start', 'barge-in']);
    expect(events[0].at).toBeGreaterThanOrEqual(DEFAULT_VAD_CONFIG.bargeInStartMs);
  });

  it('does not learn AI echo as background noise', () => {
    const vad = new VoiceActivityDetector();
    const clock = { t: 0 };
    feed(vad, clock, QUIET, 2_000);
    const before = vad.noiseFloor;
    feed(vad, clock, 0.03, 10_000, true);
    expect(vad.noiseFloor).toBe(before);
  });
});
