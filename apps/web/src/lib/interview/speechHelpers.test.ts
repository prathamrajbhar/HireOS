import { describe, expect, it } from 'vitest';
import { isEchoOfAi } from './speechHelpers';

const AI = 'Welcome to the interview. Tell me about a challenging project you worked on recently.';

describe('isEchoOfAi', () => {
  it('flags the mic hearing the interviewer (full or partial repeat)', () => {
    expect(isEchoOfAi('tell me about a challenging project you worked on', AI)).toBe(true);
    expect(isEchoOfAi('Welcome to the interview', AI)).toBe(true);
  });

  it('does not flag a genuine answer, even one that reuses some question words', () => {
    expect(isEchoOfAi('I built a payment service using Node and Postgres last year', AI)).toBe(false);
    expect(isEchoOfAi('The most challenging project I worked on was a data migration', AI)).toBe(false);
  });

  it('never flags short utterances or when there is no AI text', () => {
    expect(isEchoOfAi('yes', AI)).toBe(false);
    expect(isEchoOfAi('the interview', AI)).toBe(false);
    expect(isEchoOfAi('tell me about a challenging project', '')).toBe(false);
  });

  it('ignores case and punctuation', () => {
    expect(isEchoOfAi('TELL ME, about a challenging project!', AI)).toBe(true);
  });
});
