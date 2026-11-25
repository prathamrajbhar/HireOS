import { describe, expect, it, vi } from 'vitest';
import { SttError } from './sttApi';
import { processUtterance, type ProcessDeps } from './utteranceProcessor';

const utterance = { blob: new Blob(['x']), mime: 'audio/webm', speechMs: 3000 };
const AI = 'Tell me about a challenging project you worked on recently.';

function setup(transcribe: ProcessDeps['transcribe']) {
  const deps = { transcribe, getAiText: () => AI, onFinal: vi.fn(), onError: vi.fn() };
  return { deps, run: (u = utterance) => processUtterance(u, deps) };
}

describe('processUtterance', () => {
  it('submits a genuine answer', async () => {
    const { deps, run } = setup(async () => ({ text: 'I built a payment service in Node', noSpeech: false }));
    expect(await run()).toBe('submitted');
    expect(deps.onFinal).toHaveBeenCalledWith('I built a payment service in Node');
  });

  it.each([
    ['empty transcript', { text: '', noSpeech: true }, 3000],
    ['punctuation only', { text: '.', noSpeech: false }, 3000],
    ['silence phantom on a tiny clip', { text: 'Thank you.', noSpeech: false }, 500],
    ['the mic hearing the AI', { text: 'tell me about a challenging project you worked on', noSpeech: false }, 3000],
  ])('ignores %s', async (_name, result, speechMs) => {
    const { deps, run } = setup(async () => result);
    expect(await run({ ...utterance, speechMs })).toBe('ignored');
    expect(deps.onFinal).not.toHaveBeenCalled();
    expect(deps.onError).not.toHaveBeenCalled();
  });

  it('tells the candidate when the speech service fails, and never submits', async () => {
    const { deps, run } = setup(async () => {
      throw new SttError('unavailable', '503');
    });
    expect(await run()).toBe('failed');
    expect(deps.onError).toHaveBeenCalledWith(expect.stringMatching(/unavailable.*type your response/i));
    expect(deps.onFinal).not.toHaveBeenCalled();
  });

  it('treats an unexpected error as a network problem', async () => {
    const { deps, run } = setup(async () => {
      throw new Error('boom');
    });
    expect(await run()).toBe('failed');
    expect(deps.onError).toHaveBeenCalledWith(expect.stringMatching(/reach the speech service/i));
  });
});
