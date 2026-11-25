import { describe, expect, it } from 'vitest';
import { fileNameForMime, isLikelyHallucination, pickRecorderMimeType } from './utterance';

describe('pickRecorderMimeType', () => {
  it('prefers webm/opus, then falls back to what the browser supports', () => {
    expect(pickRecorderMimeType(() => true)).toBe('audio/webm;codecs=opus');
    expect(pickRecorderMimeType((m) => m === 'audio/mp4')).toBe('audio/mp4'); // Safari
    expect(pickRecorderMimeType((m) => m.startsWith('audio/ogg'))).toBe('audio/ogg;codecs=opus');
    expect(pickRecorderMimeType(() => false)).toBeUndefined();
  });
});

describe('fileNameForMime', () => {
  it.each([
    ['audio/webm;codecs=opus', 'answer.webm'],
    ['audio/mp4', 'answer.mp4'],
    ['audio/ogg;codecs=opus', 'answer.ogg'],
    ['audio/wav', 'answer.wav'],
    ['', 'answer.webm'],
  ])('%s -> %s', (mime, name) => expect(fileNameForMime(mime)).toBe(name));
});

describe('isLikelyHallucination', () => {
  it('rejects punctuation-only output', () => {
    expect(isLikelyHallucination('.', 5000)).toBe(true);
    expect(isLikelyHallucination('...?', 5000)).toBe(true);
  });

  it('rejects classic silence phantoms, but only for very short clips', () => {
    expect(isLikelyHallucination('Thank you.', 500)).toBe(true);
    expect(isLikelyHallucination('Thanks for watching!', 800)).toBe(true);
    expect(isLikelyHallucination('Thank you.', 3000)).toBe(false);
  });

  it('keeps real answers', () => {
    expect(isLikelyHallucination('I built a payment service', 600)).toBe(false);
    expect(isLikelyHallucination('Yes', 500)).toBe(false);
  });
});
