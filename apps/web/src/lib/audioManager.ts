
let globalAudioInstance: HTMLAudioElement | null = null;
let lastAudioUrl: string | null = null;
let lastText = '';
let currentBlobUrl: string | null = null;
// Set to true by stopAudio() so any dangling onEnd/onerror callbacks know to bail out
let _audioStopped = false;
// onEnd of the clip currently playing; lets interruptAudio() complete the turn instead of stranding it
let pendingOnEnd: (() => void) | null = null;

/** Lets a streaming player (see voiceStream.ts) take part in stop/interrupt without a circular import. */
export interface PlaybackController {
  stop(): void;
  interrupt(): void;
}
let playbackController: PlaybackController | null = null;

export function registerPlaybackController(controller: PlaybackController | null) {
  playbackController = controller;
}

/** Re-arms speech callbacks after a stopAudio(); called when a new playback session begins. */
export function beginPlayback() {
  _audioStopped = false;
}

function trackOnEnd(onEnd?: () => void): (() => void) | undefined {
  if (!onEnd) {
    pendingOnEnd = null;
    return undefined;
  }
  let fired = false;
  const once = () => {
    if (fired) return;
    fired = true;
    if (pendingOnEnd === once) pendingOnEnd = null;
    onEnd();
  };
  pendingOnEnd = once;
  return once;
}

function revokeCurrentBlobUrl() {
  if (currentBlobUrl) {
    try {
      URL.revokeObjectURL(currentBlobUrl);
    } catch {}
    currentBlobUrl = null;
  }
}

export function getAudioInstance(): HTMLAudioElement {
  if (typeof window === 'undefined') {
    return {} as HTMLAudioElement;
  }
  if (!globalAudioInstance) {
    globalAudioInstance = new Audio();
  }
  return globalAudioInstance;
}

export function unlockAudio() {
  try {
    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      ctx.resume().then(() => ctx.close()).catch(() => {});
    }

    const audio = getAudioInstance();

    audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP//';
    audio.play().then(() => audio.pause()).catch(() => {});

    if (window.speechSynthesis && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch (err) {
    console.warn('Failed to pre-unlock audio:', err);
  }
}

export function dataUriToBlobUrl(dataUri: string): string {
  try {
    if (!dataUri.startsWith('data:')) return dataUri;
    const [header, base64Data] = dataUri.split(',');
    if (!base64Data) return dataUri;
    const mimeMatch = header.match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'audio/mp3';
    const binary = atob(base64Data);
    const len = binary.length;
    const buffer = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([buffer], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn('dataUriToBlobUrl conversion failed:', err);
    return dataUri;
  }
}

export function playSpeechSynthesis(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (onEnd) onEnd();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const targetVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft'))
    );
    if (targetVoice) utterance.voice = targetVoice;

    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => {
      // Guard: if stopAudio() was called, don't trigger next-turn callbacks
      if (_audioStopped) return;
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      if (_audioStopped) return;
      if (onEnd) onEnd();
    };

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.speak(utterance);
  } catch {
    if (_audioStopped) return;
    if (onEnd) onEnd();
  }
}

export function playAudio(text: string, audioUrl?: string, onEnd?: () => void) {
  playbackController?.stop();  // a streamed reply must never overlap a one-shot clip
  _audioStopped = false;  // Mark as active before starting any playback
  lastText = text;
  if (audioUrl) {
    lastAudioUrl = audioUrl;
  }

  stopAudio();
  _audioStopped = false;  // Reset again after stopAudio clears the flag
  onEnd = trackOnEnd(onEnd);

  if (audioUrl) {
    try {
      revokeCurrentBlobUrl();
      const playableUrl = dataUriToBlobUrl(audioUrl);
      const audio = getAudioInstance();
      if (playableUrl !== audioUrl) {
        currentBlobUrl = playableUrl;
      }
      audio.src = playableUrl;
      audio.volume = 1.0;

      audio.onended = () => {
        if (_audioStopped) return;
        if (onEnd) onEnd();
      };
      // IMPORTANT: null-check _audioStopped before falling back to speech synthesis.
      // Setting audio.src='' in stopAudio() fires onerror, which without this guard
      // would restart speech synthesis — causing audio to keep playing after navigation.
      audio.onerror = () => {
        if (_audioStopped) return;
        playSpeechSynthesis(text, onEnd);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          if (_audioStopped) return;
          playSpeechSynthesis(text, onEnd);
        });
      }
      return;
    } catch {
      if (!_audioStopped) playSpeechSynthesis(text, onEnd);
      return;
    }
  }

  if (!_audioStopped) {
    playSpeechSynthesis(text, onEnd);
  }
}

/**
 * Stops playback because the candidate started talking. Unlike stopAudio(), the clip's onEnd is
 * still delivered once, so callers' "AI is speaking" state is reset and the turn can continue.
 */
export function interruptAudio() {
  const finish = pendingOnEnd;
  playbackController?.interrupt();  // first: stopAudio() below would cancel the stream silently
  stopAudio();
  finish?.();
}

export function stopAudio() {
  pendingOnEnd = null;  // Navigation/teardown: callbacks must NOT fire
  playbackController?.stop();
  if (typeof window !== 'undefined') {
    _audioStopped = true;  // Signal all callbacks to abort before we tear down
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch {}
    revokeCurrentBlobUrl();
    if (globalAudioInstance) {
      try {
        // Null out handlers FIRST — setting src='' fires onerror, which without
        // this would restart speech synthesis via the fallback path.
        globalAudioInstance.onended = null;
        globalAudioInstance.onerror = null;
        globalAudioInstance.pause();
        globalAudioInstance.currentTime = 0;
        globalAudioInstance.src = '';
      } catch {}
    }
  }
}

export function replayLastAudio(onEnd?: () => void) {
  if (lastText) {
    playAudio(lastText, lastAudioUrl || undefined, onEnd);
  }
}
