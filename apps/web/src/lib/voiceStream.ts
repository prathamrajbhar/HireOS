import {
  beginPlayback,
  dataUriToBlobUrl,
  getAudioInstance,
  playSpeechSynthesis,
  registerPlaybackController,
  stopAudio,
} from './audioManager';

export interface VoiceChunk {
  sentence: string;
  /** data: URI of the sentence audio; empty means "speak it with the browser voice". */
  audio: string;
}

export interface VoiceStreamHandle {
  push(chunk: VoiceChunk): void;
  /** No more chunks are coming; onEnd fires once the queue has been spoken. */
  end(): void;
  /** Teardown: stop immediately and never call onEnd. */
  cancel(): void;
}

class VoiceStream implements VoiceStreamHandle {
  private queue: VoiceChunk[] = [];
  private ended = false;
  private playing = false;
  private closed = false;
  private blobUrl: string | null = null;
  private abortChunk: (() => void) | null = null;

  constructor(
    private readonly onEnd: () => void,
    private readonly release: (s: VoiceStream) => void
  ) {}

  push(chunk: VoiceChunk): void {
    if (this.closed || this.ended) return;
    this.queue.push(chunk);
    this.pump();
  }

  end(): void {
    if (this.closed) return;
    this.ended = true;
    this.pump();
  }

  cancel(): void {
    this.shutdown();
  }

  /** The candidate started talking: stop now, but still tell the owner the AI is done. */
  interrupt(): void {
    if (this.closed) return;
    this.shutdown();
    this.onEnd();
  }

  private shutdown(): void {
    if (this.closed) return;
    this.closed = true;
    this.queue = [];
    this.abortChunk?.();
    this.abortChunk = null;
    this.revoke();
    const audio = getAudioInstance();
    try {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.src = '';
    } catch {}
    try {
      window.speechSynthesis?.cancel();
    } catch {}
    this.release(this);
  }

  private pump(): void {
    if (this.closed || this.playing) return;
    const next = this.queue.shift();
    if (!next) {
      if (this.ended) {
        this.closed = true;
        this.release(this);
        this.onEnd();
      }
      return;
    }
    this.playing = true;
    this.playChunk(next, () => {
      this.playing = false;
      this.revoke();
      this.pump();
    });
  }

  private playChunk(chunk: VoiceChunk, done: () => void): void {
    let settled = false;
    const finish = () => {
      if (settled || this.closed) return;
      settled = true;
      this.abortChunk = null;
      done();
    };
    this.abortChunk = () => {
      settled = true;
    };
    let fallbackStarted = false; // an audio error and a play() rejection can both fire for one clip
    const speakWithBrowser = (reason: string) => {
      if (settled || this.closed || fallbackStarted) return;
      fallbackStarted = true;
      warnFallback(reason);
      playSpeechSynthesis(chunk.sentence, finish);
    };

    if (!chunk.audio) {
      speakWithBrowser('the server sent no audio for this sentence');
      return;
    }

    try {
      const audio = getAudioInstance();
      this.revoke();
      this.blobUrl = dataUriToBlobUrl(chunk.audio);
      audio.src = this.blobUrl;
      audio.volume = 1;
      audio.onended = finish;
      audio.onerror = () => speakWithBrowser(`audio element error (code ${audio.error?.code ?? 'unknown'})`);
      audio.play()?.catch((err: unknown) => {
        const name = err instanceof DOMException ? err.name : 'error';
        speakWithBrowser(
          name === 'NotAllowedError'
            ? 'the browser blocked autoplay (NotAllowedError): interact with the page, then try again'
            : `play() failed (${name})`
        );
      });
    } catch (err) {
      speakWithBrowser(`could not start playback (${err instanceof Error ? err.message : 'unknown'})`);
    }
  }

  private revoke(): void {
    if (!this.blobUrl) return;
    try {
      URL.revokeObjectURL(this.blobUrl);
    } catch {}
    this.blobUrl = null;
  }
}

/**
 * Falling back to the browser voice is silent on machines with no installed speech voices (common on
 * Linux), which looks like "no TTS". Say why we fell back, and warn when the fallback cannot speak.
 */
function warnFallback(reason: string): void {
  console.warn(`[voice] using the browser voice because ${reason}.`);
  try {
    if (window.speechSynthesis && window.speechSynthesis.getVoices().length === 0) {
      console.warn('[voice] this browser reports no speech voices, so the fallback will likely be silent.');
    }
  } catch {}
}

let active: VoiceStream | null = null;

registerPlaybackController({
  stop: () => active?.cancel(),
  interrupt: () => active?.interrupt(),
});

export const voiceStream = {
  /** Starts a new streamed reply, silencing anything that was still playing. */
  open(onEnd: () => void): VoiceStreamHandle {
    stopAudio();
    beginPlayback();
    const stream = new VoiceStream(onEnd, (s) => {
      if (active === s) active = null;
    });
    active = stream;
    return stream;
  },
};
