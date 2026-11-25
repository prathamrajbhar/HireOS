import { siteConfig } from '@/lib/config';
import { requestAiTurn } from './interviewSessionApi';
import { SseParser } from './sse';

export type AiTurnParams = Parameters<typeof requestAiTurn>[0];

export interface AiTurn {
  text: string;
  stage?: string;
  analysis?: unknown;
  turnRecord?: unknown;
  isComplete?: boolean;
  /** The reply split into the sentences whose audio will follow. */
  sentences: string[];
}

export interface AiAudioChunk {
  index: number;
  sentence: string;
  /** data: URI; empty when the server could not synthesize this sentence. */
  audio: string;
}

export interface AiStreamHandlers {
  signal?: AbortSignal;
  onTurn(turn: AiTurn): void;
  onAudio(chunk: AiAudioChunk): void;
}

/**
 * complete    - every sentence arrived
 * interrupted - the text arrived but the audio stream broke; `received` sentences were delivered
 * aborted     - the caller cancelled (candidate left); nothing further was delivered
 */
export interface AiStreamResult {
  status: 'complete' | 'interrupted' | 'aborted';
  received: number;
}

const isAbort = (err: unknown, signal?: AbortSignal) =>
  Boolean(signal?.aborted) || (err instanceof DOMException && err.name === 'AbortError');

/**
 * Asks the interviewer for its next turn over a stream: the text is delivered as soon as the LLM
 * finishes, then each sentence's audio as the server produces it. Rejects only if no reply arrived.
 */
export async function requestAiTurnStream(params: AiTurnParams, handlers: AiStreamHandlers): Promise<AiStreamResult> {
  const { signal, onTurn, onAudio } = handlers;

  let res: Response;
  try {
    res = await fetch(`${siteConfig.aiServiceUrl}/api/v1/ai/interview/respond-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(params),
      signal,
    });
  } catch (err) {
    if (isAbort(err, signal)) return { status: 'aborted', received: 0 };
    throw err;
  }

  // An older AI service without the streaming route: use the one-shot endpoint instead.
  if (res.status === 404 || res.status === 405) return oneShot(params, handlers);
  if (!res.ok || !res.body) throw new Error(`AI respond failed: ${res.status} ${res.statusText}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parser = new SseParser();
  let turnDelivered = false;
  let received = 0;
  let finished = false;

  try {
    while (!finished) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const event of parser.push(decoder.decode(value, { stream: true }))) {
        const data = JSON.parse(event.data);
        if (event.event === 'turn') {
          if (typeof data.text !== 'string' || !data.text.trim()) {
            throw new Error('AI returned an unexpected response format.');
          }
          turnDelivered = true;
          onTurn({ ...data, sentences: Array.isArray(data.sentences) ? data.sentences : [data.text] });
        } else if (event.event === 'audio' && turnDelivered) {
          received += 1;
          onAudio({ index: data.index, sentence: data.sentence, audio: data.audio || '' });
        } else if (event.event === 'error') {
          if (!turnDelivered) throw new Error(data.message || 'AI stream failed.');
          finished = true;
        } else if (event.event === 'done') {
          return { status: 'complete', received };
        }
      }
    }
  } catch (err) {
    if (isAbort(err, signal)) return { status: 'aborted', received };
    if (!turnDelivered) throw err;
  } finally {
    reader.cancel().catch(() => {});
  }

  if (signal?.aborted) return { status: 'aborted', received };
  if (!turnDelivered) throw new Error('AI stream ended before a reply was received.');
  return { status: 'interrupted', received };
}

async function oneShot(params: AiTurnParams, { signal, onTurn, onAudio }: AiStreamHandlers): Promise<AiStreamResult> {
  let response: Awaited<ReturnType<typeof requestAiTurn>>;
  try {
    response = await requestAiTurn(params, signal);
  } catch (err) {
    if (isAbort(err, signal)) return { status: 'aborted', received: 0 };
    throw err;
  }
  if (signal?.aborted) return { status: 'aborted', received: 0 };
  onTurn({ text: response.text, stage: response.stage, analysis: response.analysis, turnRecord: response.turnRecord, sentences: [response.text] });
  onAudio({ index: 0, sentence: response.text, audio: response.audioUrl || '' });
  return { status: 'complete', received: 1 };
}
