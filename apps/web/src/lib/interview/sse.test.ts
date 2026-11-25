import { describe, expect, it } from 'vitest';
import { SseParser } from './sse';

describe('SseParser', () => {
  it('parses complete events', () => {
    const p = new SseParser();
    expect(p.push('event: turn\ndata: {"a":1}\n\nevent: done\ndata: {}\n\n')).toEqual([
      { event: 'turn', data: '{"a":1}' },
      { event: 'done', data: '{}' },
    ]);
  });

  it('reassembles events split at any byte boundary', () => {
    const wire = 'event: audio\ndata: {"index":0,"audio":"data:audio/mp3;base64,AAA="}\n\nevent: done\ndata: {}\n\n';
    for (let cut = 1; cut < wire.length; cut++) {
      const p = new SseParser();
      const events = [...p.push(wire.slice(0, cut)), ...p.push(wire.slice(cut))];
      expect(events.map((e) => e.event), `cut at ${cut}`).toEqual(['audio', 'done']);
    }
  });

  it('holds an incomplete event until its terminator arrives', () => {
    const p = new SseParser();
    expect(p.push('event: turn\ndata: {"x"')).toEqual([]);
    expect(p.push(':1}\n\n')).toEqual([{ event: 'turn', data: '{"x":1}' }]);
  });

  it('handles CRLF, comments, multi-line data and the default event name', () => {
    const p = new SseParser();
    expect(p.push(': keep-alive\r\n\r\ndata: one\r\ndata: two\r\n\r\n')).toEqual([{ event: 'message', data: 'one\ntwo' }]);
  });

  it('ignores blocks with no data', () => {
    expect(new SseParser().push('event: ping\n\n')).toEqual([]);
  });
});
