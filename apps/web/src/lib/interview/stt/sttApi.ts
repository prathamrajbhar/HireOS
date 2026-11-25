import { siteConfig } from '@/lib/config';
import { fileNameForMime } from './utterance';

export type SttErrorKind = 'unavailable' | 'network' | 'rejected';

export class SttError extends Error {
  constructor(
    public readonly kind: SttErrorKind,
    message: string
  ) {
    super(message);
    this.name = 'SttError';
  }
}

export interface TranscriptionResult {
  text: string;
  noSpeech: boolean;
}

const TRANSCRIBE_TIMEOUT_MS = 20_000;

/** Sends one recorded utterance to the AI service's Whisper endpoint. */
export async function transcribeUtterance(blob: Blob, mime: string): Promise<TranscriptionResult> {
  const form = new FormData();
  form.append('file', blob, fileNameForMime(mime));

  let res: Response;
  try {
    res = await fetch(`${siteConfig.aiServiceUrl}/api/v1/ai/interview/transcribe`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS),
    });
  } catch {
    throw new SttError('network', 'Could not reach the speech service.');
  }

  if (res.status === 503 || res.status >= 500) {
    throw new SttError('unavailable', `Speech service unavailable (${res.status}).`);
  }
  if (!res.ok) {
    throw new SttError('rejected', `Speech service rejected the audio (${res.status}).`);
  }

  const data = (await res.json()) as { transcript?: string; no_speech?: boolean };
  const text = typeof data.transcript === 'string' ? data.transcript.trim() : '';
  return { text, noSpeech: Boolean(data.no_speech) || !text };
}
