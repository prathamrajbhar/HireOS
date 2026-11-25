const MIN_WORDS_FOR_ECHO_CHECK = 3;
const ECHO_OVERLAP_RATIO = 0.75;

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
}

/**
 * True when the recognised text is mostly the AI's own words, i.e. the microphone is hearing the
 * interviewer through the speakers. Short utterances are never treated as echo.
 */
export function isEchoOfAi(transcript: string, aiText: string): boolean {
  const heard = words(transcript);
  if (heard.length < MIN_WORDS_FOR_ECHO_CHECK || !aiText) return false;
  const aiWords = new Set(words(aiText));
  const overlap = heard.filter((w) => aiWords.has(w)).length;
  return overlap / heard.length >= ECHO_OVERLAP_RATIO;
}
