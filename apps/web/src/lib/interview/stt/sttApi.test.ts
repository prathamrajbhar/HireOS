import { afterEach, describe, expect, it, vi } from 'vitest';
import { SttError, transcribeUtterance } from './sttApi';

const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' });

function mockFetch(impl: (url: string, init: RequestInit) => Promise<Response> | Response) {
  const fn = vi.fn(async (url: string, init: RequestInit) => impl(url, init));
  vi.stubGlobal('fetch', fn);
  return fn;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('transcribeUtterance', () => {
  it('uploads the clip as multipart with a decodable filename and returns the text', async () => {
    const fetchMock = mockFetch(() => json({ transcript: '  I led the migration ', confidence: 0.9, no_speech: false }));
    const result = await transcribeUtterance(blob, 'audio/webm;codecs=opus');

    expect(result).toEqual({ text: 'I led the migration', noSpeech: false });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/ai\/interview\/transcribe$/);
    expect(init.method).toBe('POST');
    const file = (init.body as FormData).get('file') as File;
    expect(file.name).toBe('answer.webm');
    expect(file.size).toBe(3);
  });

  it('reports no speech for an empty transcript', async () => {
    mockFetch(() => json({ transcript: '', no_speech: true }));
    expect(await transcribeUtterance(blob, 'audio/webm')).toEqual({ text: '', noSpeech: true });
  });

  it('classifies failures so the candidate gets the right message', async () => {
    mockFetch(() => json({ detail: 'provider down' }, 503));
    await expect(transcribeUtterance(blob, 'audio/webm')).rejects.toMatchObject({ kind: 'unavailable' });

    mockFetch(() => json({ detail: 'x' }, 500));
    await expect(transcribeUtterance(blob, 'audio/webm')).rejects.toMatchObject({ kind: 'unavailable' });

    mockFetch(() => json({ detail: 'bad audio' }, 400));
    await expect(transcribeUtterance(blob, 'audio/webm')).rejects.toMatchObject({ kind: 'rejected' });

    mockFetch(() => {
      throw new TypeError('Failed to fetch');
    });
    const err = await transcribeUtterance(blob, 'audio/webm').catch((e) => e);
    expect(err).toBeInstanceOf(SttError);
    expect(err.kind).toBe('network');
  });
});
