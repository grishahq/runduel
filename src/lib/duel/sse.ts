import type { AgnoEvent } from './types'
const LIMIT = 2 * 1024 * 1024

/** Strict SSE framing, including fragmented UTF-8, CRLF, comments and multiline data. */
export async function readEvents(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: AgnoEvent) => void | boolean,
  signal?: AbortSignal
) {
  const reader = body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let buffer = ''
  const abort = () => {
    void reader.cancel().catch(() => {})
  }
  signal?.addEventListener('abort', abort, { once: true })
  const frame = (text: string) => {
    let name = ''
    const data: string[] = []
    for (const line of text.split('\n')) {
      if (line.startsWith(':') || !line) continue
      const index = line.indexOf(':')
      const key = index < 0 ? line : line.slice(0, index)
      const value = index < 0 ? '' : line.slice(index + 1).replace(/^ /, '')
      if (key === 'event') name = value
      if (key === 'data') data.push(value)
    }
    if (!data.length) return
    let parsed: unknown
    try {
      parsed = JSON.parse(data.join('\n'))
    } catch {
      throw new Error('Malformed JSON in event stream')
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('Event data must be an object')
    const obj = parsed as Record<string, unknown>
    // Support the event/data envelope already handled by upstream Agent UI.
    let payload = obj
    if ('data' in obj && typeof obj.event === 'string') {
      const nested =
        typeof obj.data === 'string' ? JSON.parse(obj.data) : obj.data
      if (!nested || typeof nested !== 'object' || Array.isArray(nested))
        throw new Error('Invalid event envelope')
      payload = { ...nested, event: obj.event }
    }
    const event = payload.event ?? name
    if (typeof event !== 'string' || !event)
      throw new Error('Missing event name')
    if (name && payload.event && name !== payload.event)
      throw new Error('Conflicting event names')
    return onEvent({ ...payload, event })
  }
  try {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
    while (true) {
      const { value, done } = await reader.read()
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true })
      // Normalize CRLF only after both bytes have arrived.
      buffer = buffer.replace(/\r\n/g, '\n')
      if (buffer.length > LIMIT)
        throw new Error('Event frame exceeds 2 MiB limit')
      let boundary: number
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        if (frame(buffer.slice(0, boundary)) === false) return
        buffer = buffer.slice(boundary + 2)
      }
      if (done) break
    }
    if (buffer.trim() && !buffer.trim().startsWith(':'))
      throw new Error('Truncated event stream')
  } finally {
    signal?.removeEventListener('abort', abort)
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
