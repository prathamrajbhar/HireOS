import type { VoiceChunk, VoiceStreamHandle } from '@/lib/voiceStream';
import type { AiTurn, AiTurnParams, requestAiTurnStream } from './aiTurnStream';

export interface TurnCallbacks {
  /** The reply text is ready (the LLM finished): show it and leave the "thinking" state. */
  onTurn(turn: AiTurn): void;
  onSpeaking(speaking: boolean): void;
}

export interface TurnDeps {
  stream: typeof requestAiTurnStream;
  voice: { open(onEnd: () => void): VoiceStreamHandle };
  /** False once the session is closed; nothing may be shown or spoken after that. */
  isAlive(): boolean;
}

export type TurnOutcome = 'completed' | 'cancelled';

/**
 * Runs one interviewer turn: shows the text as soon as it arrives and plays each sentence's audio as
 * it streams in. Every callback re-checks isAlive(), so a response that lands after the candidate
 * ended or left can never open a voice stream. Rejects only if no reply arrived at all.
 */
export async function runAiTurn(
  params: AiTurnParams,
  signal: AbortSignal,
  callbacks: TurnCallbacks,
  deps: TurnDeps
): Promise<TurnOutcome> {
  // Assigned from stream callbacks, so kept in an object rather than narrowed `let`s.
  const run: { handle: VoiceStreamHandle | null; turn: AiTurn | null } = { handle: null, turn: null };

  const result = await deps.stream(params, {
    signal,
    onTurn: (t) => {
      if (!deps.isAlive() || signal.aborted) return;
      run.turn = t;
      callbacks.onTurn(t);
      callbacks.onSpeaking(true);
      run.handle = deps.voice.open(() => callbacks.onSpeaking(false));
    },
    onAudio: (chunk) => {
      if (!deps.isAlive() || signal.aborted) return;
      run.handle?.push({ sentence: chunk.sentence, audio: chunk.audio });
    },
  });

  if (!deps.isAlive() || signal.aborted || result.status === 'aborted') {
    run.handle?.cancel();
    if (deps.isAlive()) callbacks.onSpeaking(false);
    return 'cancelled';
  }

  if (run.handle && run.turn && result.status === 'interrupted') {
    // The audio stream broke part-way: speak what is left with the browser voice.
    const rest: VoiceChunk[] = run.turn.sentences.slice(result.received).map((sentence) => ({ sentence, audio: '' }));
    rest.forEach((chunk) => run.handle?.push(chunk));
  }
  run.handle?.end();
  return 'completed';
}
