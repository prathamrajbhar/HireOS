export interface SseEvent {
  event: string;
  data: string;
}

/**
 * Incremental Server-Sent-Events parser. Feed it decoded text as it arrives (chunks may split an
 * event anywhere); it returns every event that became complete.
 */
export class SseParser {
  private buffer = '';

  push(text: string): SseEvent[] {
    this.buffer += text.replace(/\r\n/g, '\n');
    const events: SseEvent[] = [];
    let boundary: number;
    while ((boundary = this.buffer.indexOf('\n\n')) !== -1) {
      const block = this.buffer.slice(0, boundary);
      this.buffer = this.buffer.slice(boundary + 2);
      const parsed = parseBlock(block);
      if (parsed) events.push(parsed);
    }
    return events;
  }
}

function parseBlock(block: string): SseEvent | null {
  let event = 'message';
  const data: string[] = [];
  for (const line of block.split('\n')) {
    if (!line || line.startsWith(':')) continue; // comment / keep-alive
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');
    if (field === 'event') event = value;
    else if (field === 'data') data.push(value);
  }
  return data.length ? { event, data: data.join('\n') } : null;
}
