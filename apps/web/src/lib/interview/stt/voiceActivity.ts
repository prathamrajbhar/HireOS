/**
 * Energy-based voice activity detection with an adaptive noise floor.
 * Pure and clock-injected (`nowMs` is passed in) so it is fully testable without audio hardware.
 */
export interface VadConfig {
  /** Never treat anything quieter than this (RMS, 0..1) as speech. */
  absoluteThreshold: number;
  /** Speech must exceed noiseFloor * this. */
  noiseMultiplier: number;
  /** Once speaking, drop out only below threshold * this (hysteresis). */
  releaseRatio: number;
  /** Sustained loudness needed to start an utterance. */
  startMs: number;
  /** Silence needed to end an utterance. */
  endSilenceMs: number;
  /** Utterances shorter than this are noise (coughs, clicks) and are discarded. */
  minSpeechMs: number;
  maxUtteranceMs: number;
  /** While the AI is talking, speech must be this much louder than normal... */
  aiSpeakingMultiplier: number;
  /** ...and sustained this long before it counts as the candidate interrupting. */
  bargeInStartMs: number;
}

export const DEFAULT_VAD_CONFIG: VadConfig = {
  absoluteThreshold: 0.015,
  noiseMultiplier: 3,
  releaseRatio: 0.6,
  startMs: 150,
  endSilenceMs: 1400,
  minSpeechMs: 400,
  maxUtteranceMs: 60_000,
  aiSpeakingMultiplier: 3,
  bargeInStartMs: 900,
};

export type VadEvent =
  | { type: 'speech-start' }
  | { type: 'barge-in' }
  | { type: 'speech-end'; speechMs: number; forced: boolean }
  | { type: 'speech-cancel' };

const INITIAL_NOISE_FLOOR = 0.005;
const MAX_NOISE_FLOOR = 0.04;
const NOISE_SMOOTHING = 0.02;

export class VoiceActivityDetector {
  private floor = INITIAL_NOISE_FLOOR;
  private inSpeech = false;
  private aboveSince: number | null = null;
  private belowSince: number | null = null;
  private speechStartedAt = 0;

  constructor(private readonly config: VadConfig = DEFAULT_VAD_CONFIG) {}

  get speaking(): boolean {
    return this.inSpeech;
  }

  get noiseFloor(): number {
    return this.floor;
  }

  reset(): void {
    this.inSpeech = false;
    this.aboveSince = null;
    this.belowSince = null;
  }

  push(rms: number, nowMs: number, aiSpeaking = false): VadEvent[] {
    const c = this.config;
    let threshold = Math.max(c.absoluteThreshold, this.floor * c.noiseMultiplier);
    if (aiSpeaking) threshold *= c.aiSpeakingMultiplier;
    const above = rms >= (this.inSpeech ? threshold * c.releaseRatio : threshold);

    // Learn the room's background level only from quiet, AI-silent moments (AI echo would inflate it).
    if (!above && !this.inSpeech && !aiSpeaking) {
      this.floor = Math.min(MAX_NOISE_FLOOR, this.floor * (1 - NOISE_SMOOTHING) + rms * NOISE_SMOOTHING);
    }

    return this.inSpeech ? this.whileSpeaking(above, nowMs) : this.whileIdle(above, nowMs, aiSpeaking);
  }

  private whileIdle(above: boolean, nowMs: number, aiSpeaking: boolean): VadEvent[] {
    if (!above) {
      this.aboveSince = null;
      return [];
    }
    this.aboveSince ??= nowMs;
    const needed = aiSpeaking ? this.config.bargeInStartMs : this.config.startMs;
    if (nowMs - this.aboveSince < needed) return [];

    this.inSpeech = true;
    this.speechStartedAt = this.aboveSince;
    this.belowSince = null;
    return aiSpeaking ? [{ type: 'speech-start' }, { type: 'barge-in' }] : [{ type: 'speech-start' }];
  }

  private whileSpeaking(above: boolean, nowMs: number): VadEvent[] {
    if (above) {
      this.belowSince = null;
      if (nowMs - this.speechStartedAt >= this.config.maxUtteranceMs) {
        return this.finish(nowMs - this.speechStartedAt, true);
      }
      return [];
    }
    this.belowSince ??= nowMs;
    if (nowMs - this.belowSince < this.config.endSilenceMs) return [];
    return this.finish(this.belowSince - this.speechStartedAt, false);
  }

  private finish(speechMs: number, forced: boolean): VadEvent[] {
    this.inSpeech = false;
    this.aboveSince = null;
    this.belowSince = null;
    return speechMs >= this.config.minSpeechMs
      ? [{ type: 'speech-end', speechMs, forced }]
      : [{ type: 'speech-cancel' }];
  }
}
