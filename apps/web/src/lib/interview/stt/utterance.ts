const MIME_PREFERENCE = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

/** First recorder format the browser supports (Chrome/Firefox: webm/ogg, Safari: mp4). */
export function pickRecorderMimeType(isSupported: (mime: string) => boolean): string | undefined {
  return MIME_PREFERENCE.find((m) => isSupported(m));
}

/** Upload filename; the extension tells the STT provider how to decode the audio. */
export function fileNameForMime(mime: string): string {
  if (mime.includes('webm')) return 'answer.webm';
  if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) return 'answer.mp4';
  if (mime.includes('ogg')) return 'answer.ogg';
  if (mime.includes('wav')) return 'answer.wav';
  return 'answer.webm';
}

// What Whisper tends to "hear" in near-silence. Only trusted as hallucination for very short clips.
const PHANTOM_PHRASES = new Set([
  'thank you',
  'thanks',
  'thanks for watching',
  'thank you for watching',
  'you',
  'bye',
  'bye bye',
]);
const SHORT_CLIP_MS = 1200;

export function isLikelyHallucination(text: string, speechMs: number): boolean {
  if (!/[a-z0-9]/i.test(text)) return true;
  const normalized = text.toLowerCase().replace(/[^a-z0-9 ]+/g, '').trim();
  return speechMs < SHORT_CLIP_MS && PHANTOM_PHRASES.has(normalized);
}
