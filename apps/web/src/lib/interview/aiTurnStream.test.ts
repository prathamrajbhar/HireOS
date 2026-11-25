import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestAiTurnStream, type AiAudioChunk, type AiTurn } from './aiTurnStream';

const PARAMS = { interviewId: 'i1', transcript: 'hi', turnNumber: 1, stage: 'intro', jobTitle: 'Eng', conversationHistory: [] };

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
const TURN = sse('turn', { text: 'One thing. Another thing.', stage: 'intro', sentences: ['One thing.', 'Another thing.'] });
const AUDIO = (i: number, audio = `data:audio/mp3;base64,AA${i}`) => sse('audio', { index: i, sentence: `S${i}`, audio, is_final: i === 1 });

/** A streaming Response whose chunks are released one at a time by the test. */
function controlledStream(status = 200) {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({ start: (c) => void (controller = c) });
  return {
    response: new Response(body, { status, headers: { 'Content-Type': 'text/event-stream' } }),
    send: (text: string) => controller.enqueue(enc.encode(text)),
    close: () => controller.close(),
    fail: (err: Error) => controller.error(err),
  };
}

function setup() {
  const turns: AiTurn[] = [];
  const audio: AiAudioChunk[] = [];
  return { turns, audio, handlers: { onTurn: (t: AiTurn) => turns.push(t), onAudio: (c: AiAudioChunk) => audio.push(c) } };
}

afterEach(() => vi.unstubAllGlobals());

describe('requestAiTurnStream', () => {
  it('delivers the text first and each sentence as it arrives, not at the end', async () => {
    const s = controlledStream();
    vi.stubGlobal('fetch', vi.fn(async () => s.response));
    const { turns, audio, handlers } = setup();

    const done = requestAiTurnStream(PARAMS, handlers);
    s.send(TURN);
    await vi.waitFor(() => expect(turns).toHaveLength(1));
    expect(audio).toHaveLength(0);
    expect(turns[0].sentences).toEqual(['One thing.', 'Another thing.']);

    s.send(AUDIO(0));
    await vi.waitFor(() => expect(audio).toHaveLength(1)); // available while the stream is still open
    s.send(AUDIO(1) + sse('done', {}));
    s.close();

    expect(await done).toEqual({ status: 'complete', received: 2 });
    expect(audio.map((a) => a.index)).toEqual([0, 1]);
  });

  it('copes with events split across network chunks', async () => {
    const s = controlledStream();
    vi.stubGlobal('fetch', vi.fn(async () => s.response));
    const { turns, audio, handlers } = setup();
    const wire = TURN + AUDIO(0) + AUDIO(1) + sse('done', {});
    const done = requestAiTurnStream(PARAMS, handlers);
    for (let i = 0; i < wire.length; i += 7) s.send(wire.slice(i, i + 7));
    s.close();
    expect((await done).status).toBe('complete');
    expect(turns).toHaveLength(1);
    expect(audio).toHaveLength(2);
  });

  it('posts the turn to the streaming endpoint', async () => {
    const s = controlledStream();
    const fetchMock = vi.fn(async () => s.response);
    vi.stubGlobal('fetch', fetchMock);
    const p = requestAiTurnStream(PARAMS, setup().handlers);
    s.send(TURN + sse('done', {}));
    s.close();
    await p;
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/ai\/interview\/respond-stream$/);
    expect(JSON.parse(init.body as string)).toMatchObject({ interviewId: 'i1', transcript: 'hi' });
  });

  it('maps an empty audio string through so the player can use browser speech', async () => {
    const s = controlledStream();
    vi.stubGlobal('fetch', vi.fn(async () => s.response));
    const { audio, handlers } = setup();
    const p = requestAiTurnStream(PARAMS, handlers);
    s.send(TURN + AUDIO(0, '') + sse('done', {}));
    s.close();
    await p;
    expect(audio[0].audio).toBe('');
  });

  it('rejects when the server fails before any reply (so the turn can show an error)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 503, statusText: 'Service Unavailable' })));
    await expect(requestAiTurnStream(PARAMS, setup().handlers)).rejects.toThrow(/503/);
  });

  it('rejects on an error event before the turn, and on a malformed turn', async () => {
    let s = controlledStream();
    vi.stubGlobal('fetch', vi.fn(async () => s.response));
    let p = requestAiTurnStream(PARAMS, setup().handlers);
    s.send(sse('error', { message: 'boom' }));
    s.close();
    await expect(p).rejects.toThrow('boom');

    s = controlledStream();
    p = requestAiTurnStream(PARAMS, setup().handlers);
    s.send(sse('turn', { text: '   ' }));
    s.close();
    await expect(p).rejects.toThrow(/unexpected response/);
  });

  it('keeps the reply when audio breaks mid-stream and reports how many sentences made it', async () => {
    const s = controlledStream();
    vi.stubGlobal('fetch', vi.fn(async () => s.response));
    const { turns, audio, handlers } = setup();
    const p = requestAiTurnStream(PARAMS, handlers);
    s.send(TURN + AUDIO(0));
    await vi.waitFor(() => expect(audio).toHaveLength(1));
    s.fail(new TypeError('network error'));
    expect(await p).toEqual({ status: 'interrupted', received: 1 });
    expect(turns).toHaveLength(1);
  });

  it('treats an error event after the turn as interrupted, not as a failed turn', async () => {
    const s = controlledStream();
    vi.stubGlobal('fetch', vi.fn(async () => s.response));
    const p = requestAiTurnStream(PARAMS, setup().handlers);
    s.send(TURN + AUDIO(0) + sse('error', { message: 'Voice synthesis failed.' }));
    s.close();
    expect(await p).toEqual({ status: 'interrupted', received: 1 });
  });

  it('stops delivering anything once aborted (candidate left)', async () => {
    const s = controlledStream();
    const ctrl = new AbortController();
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init: RequestInit) => {
      init.signal?.addEventListener('abort', () => s.fail(new DOMException('aborted', 'AbortError')));
      return s.response;
    }));
    const { turns, audio, handlers } = setup();
    const p = requestAiTurnStream(PARAMS, { ...handlers, signal: ctrl.signal });
    s.send(TURN);
    await vi.waitFor(() => expect(turns).toHaveLength(1));
    ctrl.abort();
    expect((await p).status).toBe('aborted');
    expect(audio).toHaveLength(0);
  });

  it('returns aborted when the request itself is aborted before a response', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError');
    }));
    expect(await requestAiTurnStream(PARAMS, { ...setup().handlers, signal: ctrl.signal })).toEqual({ status: 'aborted', received: 0 });
  });

  it('falls back to the one-shot endpoint on an older AI service', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith('/respond-stream')
        ? new Response('nf', { status: 404 })
        : new Response(JSON.stringify({ text: 'Hello there.', audioUrl: 'data:audio/mp3;base64,AAA', stage: 'intro' }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);
    const { turns, audio, handlers } = setup();
    expect(await requestAiTurnStream(PARAMS, handlers)).toEqual({ status: 'complete', received: 1 });
    expect(turns[0]).toMatchObject({ text: 'Hello there.', sentences: ['Hello there.'] });
    expect(audio[0]).toEqual({ index: 0, sentence: 'Hello there.', audio: 'data:audio/mp3;base64,AAA' });
    expect(fetchMock.mock.calls.map((c) => (c as unknown as [string])[0].split('/').pop())).toEqual(['respond-stream', 'respond']);
  });
});
