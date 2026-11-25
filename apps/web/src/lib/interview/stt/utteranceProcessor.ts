import { isEchoOfAi } from '../speechHelpers';
import { SttError, type TranscriptionResult } from './sttApi';
import { sttErrorMessage } from './sttErrors';
import { isLikelyHallucination } from './utterance';
import type { CapturedUtterance } from './micCapture';

export interface ProcessDeps {
  transcribe(blob: Blob, mime: string): Promise<TranscriptionResult>;
  /** What the interviewer is currently saying (used to drop the mic hearing the speakers). */
  getAiText(): string;
  onFinal(text: string): void;
  onError(message: string): void;
}

export type ProcessOutcome = 'submitted' | 'ignored' | 'failed';

/** Transcribes one utterance and submits it as the candidate's answer unless it is not real speech. */
export async function processUtterance(u: CapturedUtterance, deps: ProcessDeps): Promise<ProcessOutcome> {
  let result: TranscriptionResult;
  try {
    result = await deps.transcribe(u.blob, u.mime);
  } catch (err) {
    deps.onError(sttErrorMessage(err instanceof SttError ? err.kind : 'network'));
    return 'failed';
  }

  const text = result.text.trim();
  if (!text || result.noSpeech) return 'ignored';
  if (isLikelyHallucination(text, u.speechMs)) return 'ignored';
  if (isEchoOfAi(text, deps.getAiText())) return 'ignored';

  deps.onFinal(text);
  return 'submitted';
}
