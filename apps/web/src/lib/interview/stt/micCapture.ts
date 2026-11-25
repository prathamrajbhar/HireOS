import { VoiceActivityDetector, type VadConfig, type VadEvent } from './voiceActivity';
import type { MicErrorCode } from './sttErrors';

export interface RecorderLike {
  start(timesliceMs: number): void;
  stop(): void;
  ondataavailable: ((e: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
}

export interface AnalyserLike {
  /** Current loudness, RMS 0..1. */
  readRms(): number;
  close(): void;
}

/** Everything that touches the browser; replaced by fakes in tests. */
export interface MicCaptureDeps {
  recordingSupported(): boolean;
  getAudioStream(): Promise<MediaStream>;
  pickMimeType(): string | undefined;
  createAnalyser(stream: MediaStream): AnalyserLike;
  createRecorder(stream: MediaStream, mimeType?: string): RecorderLike;
  now(): number;
  setInterval(fn: () => void, ms: number): unknown;
  clearInterval(handle: unknown): void;
}

export interface CapturedUtterance {
  blob: Blob;
  mime: string;
  speechMs: number;
}

export interface MicCaptureHandlers {
  onUtterance(utterance: CapturedUtterance): void;
  /** Candidate started talking over the AI. */
  onBargeIn(): void;
  onError(code: MicErrorCode): void;
}

const TICK_MS = 40;
const RECORDER_TIMESLICE_MS = 250;
/** While nobody is speaking, restart the recorder this often so uploads never carry long silence. */
const IDLE_RECORDER_RESTART_MS = 5_000;

interface ActiveRecorder {
  recorder: RecorderLike;
  chunks: Blob[];
  startedAt: number;
}

/**
 * Keeps the mic open, detects when the candidate speaks, and hands back one audio clip per
 * utterance. The recorder runs continuously while listening, so the start of a sentence is never clipped.
 */
export class MicCapture {
  private vad: VoiceActivityDetector;
  private stream: MediaStream | null = null;
  private analyser: AnalyserLike | null = null;
  private timer: unknown = null;
  private active: ActiveRecorder | null = null;
  private mime = '';
  private listening = false;
  private aiSpeaking = false;
  private stopped = false;

  constructor(
    private readonly deps: MicCaptureDeps,
    private readonly handlers: MicCaptureHandlers,
    vadConfig?: VadConfig
  ) {
    this.vad = new VoiceActivityDetector(vadConfig);
  }

  async start(): Promise<boolean> {
    if (!this.deps.recordingSupported()) {
      this.handlers.onError('unsupported');
      return false;
    }
    let stream: MediaStream;
    try {
      stream = await this.deps.getAudioStream();
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      this.handlers.onError(name === 'NotFoundError' || name === 'OverconstrainedError' ? 'no-device' : 'denied');
      return false;
    }
    if (this.stopped) {
      stream.getTracks().forEach((t) => t.stop());
      return false;
    }

    this.stream = stream;
    this.mime = this.deps.pickMimeType() ?? '';
    this.analyser = this.deps.createAnalyser(stream);
    stream.getAudioTracks()[0]?.addEventListener('ended', () => this.handlers.onError('lost'));
    this.timer = this.deps.setInterval(() => this.tick(), TICK_MS);
    if (this.listening) this.beginRecorder();
    return true;
  }

  stop(): void {
    this.stopped = true;
    if (this.timer !== null) this.deps.clearInterval(this.timer);
    this.timer = null;
    this.discardRecorder();
    this.analyser?.close();
    this.analyser = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  setListening(listening: boolean): void {
    if (this.listening === listening) return;
    this.listening = listening;
    this.vad.reset();
    if (!this.stream) return;
    if (listening) this.beginRecorder();
    else this.discardRecorder();
  }

  setAiSpeaking(aiSpeaking: boolean): void {
    this.aiSpeaking = aiSpeaking;
  }

  private tick(): void {
    if (!this.listening || !this.analyser) return;
    const now = this.deps.now();
    for (const event of this.vad.push(this.analyser.readRms(), now, this.aiSpeaking)) {
      this.handleEvent(event);
    }
    if (!this.vad.speaking && this.active && now - this.active.startedAt > IDLE_RECORDER_RESTART_MS) {
      this.discardRecorder();
      this.beginRecorder();
    }
  }

  private handleEvent(event: VadEvent): void {
    switch (event.type) {
      case 'barge-in':
        this.handlers.onBargeIn();
        break;
      case 'speech-cancel':
        this.discardRecorder();
        this.beginRecorder();
        break;
      case 'speech-end':
        void this.deliver(event.speechMs);
        break;
      default:
        break;
    }
  }

  private async deliver(speechMs: number): Promise<void> {
    const finished = this.active;
    this.active = null;
    this.beginRecorder(); // keep listening while the finished clip is collected
    if (!finished) return;
    const blob = await this.collect(finished);
    if (blob.size > 0) this.handlers.onUtterance({ blob, mime: this.mime || blob.type, speechMs });
  }

  private collect(a: ActiveRecorder): Promise<Blob> {
    return new Promise((resolve) => {
      a.recorder.onstop = () => resolve(new Blob(a.chunks, { type: this.mime }));
      try {
        a.recorder.stop();
      } catch {
        resolve(new Blob([], { type: this.mime }));
      }
    });
  }

  private beginRecorder(): void {
    if (!this.stream || this.active) return;
    try {
      const recorder = this.deps.createRecorder(this.stream, this.mime || undefined);
      const active: ActiveRecorder = { recorder, chunks: [], startedAt: this.deps.now() };
      recorder.ondataavailable = (e) => e.data.size > 0 && active.chunks.push(e.data);
      recorder.start(RECORDER_TIMESLICE_MS);
      this.active = active;
    } catch {
      this.handlers.onError('unsupported');
    }
  }

  private discardRecorder(): void {
    const a = this.active;
    this.active = null;
    if (!a) return;
    a.recorder.ondataavailable = null;
    a.recorder.onstop = null;
    try {
      a.recorder.stop();
    } catch {}
  }
}
