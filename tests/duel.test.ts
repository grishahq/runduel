import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readEvents } from '../src/lib/duel/sse'
import { applyEvent, runStream, liveRequest } from '../src/lib/duel/run'
import {
  emptyRun,
  type AgnoEvent,
  type Comparison,
  type Run
} from '../src/lib/duel/types'
import { evaluate, htmlReport, redactedReport } from '../src/lib/duel/report'
import { tasks } from '../src/lib/duel/tasks'
import { readFile } from 'node:fs/promises'

const encode = (value: string) => new TextEncoder().encode(value)
function body(value: string, size = 1) {
  const bytes = encode(value)
  let offset = 0
  return new ReadableStream<Uint8Array>({
    pull(c) {
      if (offset === bytes.length) c.close()
      else {
        c.enqueue(bytes.slice(offset, offset + size))
        offset = Math.min(offset + size, bytes.length)
      }
    }
  })
}
const sse = (events: AgnoEvent[]) =>
  events
    .map((event) => `event: ${event.event}\ndata: ${JSON.stringify(event)}\n\n`)
    .join('')
const running = (): Run => ({ ...emptyRun('baseline'), status: 'running' })
const execute = (value: string, signal = new AbortController().signal) =>
  runStream({
    role: 'baseline',
    signal,
    open: async () =>
      new Response(body(value, 7), {
        headers: { 'content-type': 'text/event-stream' }
      }),
    onUpdate() {}
  })

test('SSE fragmentation, CRLF, multibyte UTF-8, comments, multiple frames and multiline JSON', async () => {
  const events: AgnoEvent[] = []
  await readEvents(
    body(
      ': hello\r\n\r\nevent: RunContent\r\ndata: {"event":"RunContent",\r\ndata: "content":"€{quoted}\\\""}\r\n\r\ndata: {"event":"RunCompleted"}\r\n\r\n'
    ),
    (e) => {
      events.push(e)
    }
  )
  assert.equal(events.length, 2)
  assert.equal(events[0].content, '€{quoted}"')
})
test('SSE envelope used by upstream', async () => {
  const events: AgnoEvent[] = []
  await readEvents(
    body(
      'data: {"event":"RunContent","data":"{\\\"content\\\":\\\"ok\\\"}"}\n\n'
    ),
    (e) => {
      events.push(e)
    }
  )
  assert.equal(events[0].content, 'ok')
})
for (const [name, value] of [
  ['invalid JSON', 'data: {oops}\n\n'],
  ['primitive', 'data: null\n\n'],
  ['missing event', 'data: {"content":"x"}\n\n'],
  [
    'conflicting events',
    'event: RunCompleted\ndata: {"event":"RunContent"}\n\n'
  ],
  ['truncated frame', 'data: {"event":"RunCompleted"}'],
  ['oversized frame', 'data: ' + 'x'.repeat(2 * 1024 * 1024)]
])
  test(`SSE rejects ${name}`, async () => {
    await assert.rejects(readEvents(body(value, 3000000), () => {}))
  })
test('completion replaces streamed answer, usage missing stays unknown, tools merge by ID', async () => {
  const run = await execute(
    sse([
      { event: 'RunStarted' },
      {
        event: 'ToolCallStarted',
        tool: { tool_call_id: 'a', tool_name: 'read', tool_args: { x: 1 } }
      },
      {
        event: 'ToolCallCompleted',
        tool: { tool_call_id: 'a', tool_name: 'read', result: 'ok' }
      },
      { event: 'RunContent', content: 'partial' },
      { event: 'RunCompleted', content: { currency: 'USD' } }
    ])
  )
  assert.equal(run.status, 'completed')
  assert.equal(run.answer, '{"currency":"USD"}')
  assert.equal(run.tools.length, 1)
  assert.equal(run.tools[0].status, 'completed')
  assert.deepEqual(run.usage, { inputTokens: null, outputTokens: null })
})
test('valid usage is retained, invalid metrics stay unknown', () => {
  const run = applyEvent(running(), {
    event: 'RunCompleted',
    metrics: { input_tokens: 0, output_tokens: 12 }
  })
  assert.deepEqual(run.usage, { inputTokens: 0, outputTokens: 12 })
  assert.deepEqual(
    applyEvent(running(), {
      event: 'RunCompleted',
      metrics: { input_tokens: -1, output_tokens: '12' }
    }).usage,
    { inputTokens: null, outputTokens: null }
  )
})
test('run error, paused, malformed tools, missing terminal and HTTP failures are errors', async () => {
  for (const events of [
    [{ event: 'RunError', content: 'failed' }],
    [{ event: 'RunPaused' }],
    [{ event: 'ToolCallStarted', tool: {} }],
    [{ event: 'RunContent', content: 'hi' }]
  ]) {
    assert.equal((await execute(sse(events))).status, 'error')
  }
  const run = await runStream({
    role: 'baseline',
    signal: new AbortController().signal,
    open: async () => new Response('secret body', { status: 401 }),
    onUpdate() {}
  })
  assert.equal(run.status, 'error')
  assert.equal(run.error, 'AgentOS returned HTTP 401')
})
test('terminal cancellation cannot become success on RunCompleted', async () => {
  const run = await execute(
    sse([
      { event: 'RunCancelled' },
      { event: 'RunCompleted', content: '{"currency":"USD"}' }
    ])
  )
  assert.equal(run.status, 'cancelled')
  assert.ok(evaluate(run, tasks[0].checks).every((c) => !c.passed))
})
test('user cancellation during a pending read releases stream', async () => {
  const controller = new AbortController()
  let cancelled = false
  const promise = runStream({
    role: 'baseline',
    signal: controller.signal,
    open: async () =>
      new Response(
        new ReadableStream({
          cancel() {
            cancelled = true
          }
        }),
        { headers: { 'content-type': 'text/event-stream' } }
      ),
    onUpdate() {}
  })
  setTimeout(() => controller.abort(), 10)
  assert.equal((await promise).status, 'cancelled')
  assert.equal(cancelled, true)
})
test('timeout is an error, not user cancellation', async () => {
  const run = await runStream({
    role: 'baseline',
    signal: new AbortController().signal,
    timeoutMs: 5,
    open: async () =>
      new Response(new ReadableStream(), {
        headers: { 'content-type': 'text/event-stream' }
      }),
    onUpdate() {}
  })
  assert.equal(run.status, 'error')
  assert.match(run.error!, /timed out/)
})
test('checks preserve types and zero; inherited paths are not values', () => {
  const run: Run = {
    ...running(),
    status: 'completed',
    answer: '{"total":0,"currency":"USD"}'
  }
  assert.ok(evaluate(run, [{ path: 'total', equals: 0 }])[0].passed)
  assert.equal(evaluate(run, [{ path: 'total', equals: '0' }])[0].passed, false)
  assert.equal(
    evaluate(run, [{ path: 'toString', equals: 'anything' }])[0].passed,
    false
  )
  assert.equal(
    evaluate(run, [{ path: 'invoice_id', equals: null }])[0].reason,
    'Required field is missing'
  )
})
test('allowlist exports omit adversarial secrets/free text and HTML executes no payload', () => {
  const secret =
    'private@example.test <script>alert(1)</script> Bearer top-secret'
  const run: Run = {
    ...running(),
    status: 'completed',
    answer: secret,
    error: secret,
    tools: [
      {
        id: secret,
        name: secret,
        args: secret,
        result: secret,
        status: 'completed'
      }
    ]
  }
  const comparison: Comparison = {
    schemaVersion: 1,
    mode: 'live',
    promptSha256: 'a'.repeat(64),
    task: {
      id: secret,
      title: secret,
      prompt: secret,
      checks: [{ path: secret, equals: secret }]
    },
    runs: [run, { ...run, role: 'candidate' }]
  }
  const json = JSON.stringify(redactedReport(comparison))
  const html = htmlReport(comparison)
  assert.ok(!json.includes(secret))
  assert.ok(!html.includes('private@'))
  assert.ok(!html.includes('<script>'))
  assert.match(html, /Content-Security-Policy/)
  assert.ok(json.includes('"cost":null'))
})
test('live request uses independent sessions and identical task input; endpoint validation', async () => {
  const original = globalThis.fetch
  const forms: FormData[] = []
  globalThis.fetch = async (_url, options) => {
    forms.push(options!.body as FormData)
    return new Response()
  }
  try {
    for (const id of ['a', 'b'])
      await liveRequest(
        'http://localhost:7777',
        id,
        'same input',
        ''
      )(new AbortController().signal)
    assert.equal(forms[0].get('message'), forms[1].get('message'))
    assert.notEqual(forms[0].get('session_id'), forms[1].get('session_id'))
    for (const url of [
      'file:///tmp/x',
      'https://user:pass@host',
      'https://host?token=secret'
    ])
      assert.throws(() => liveRequest(url, 'a', 'x', ''))
  } finally {
    globalThis.fetch = original
  }
})
test('recorded real AgentOS fixed suite detects every injected currency regression', async () => {
  for (const task of tasks) {
    for (const role of ['baseline', 'candidate'] as const) {
      const fixture = await readFile(
        `public/fixtures/${task.id}-${role}.sse`,
        'utf8'
      )
      const run = await execute(fixture)
      assert.equal(run.status, 'completed')
      const checks = evaluate(run, task.checks)
      assert.equal(
        checks.filter((c) => c.passed).length,
        role === 'baseline' ? 3 : 2
      )
      assert.equal(run.tools.length, role === 'baseline' ? 2 : 1)
      assert.equal(checks[2].passed, role === 'baseline')
    }
  }
})

test('terminal event finishes immediately even when connection stays open', async () => {
  let cancelled = false
  const run = await runStream({
    role: 'baseline',
    signal: new AbortController().signal,
    timeoutMs: 100,
    open: async () =>
      new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(encode(sse([{ event: 'RunCompleted', content: '{}' }])))
          },
          cancel() {
            cancelled = true
          }
        }),
        { headers: { 'content-type': 'text/event-stream' } }
      ),
    onUpdate() {}
  })
  assert.equal(run.status, 'completed')
  assert.equal(cancelled, true)
})

test('custom task validates exact scalar checks and rejects ambiguous input', async () => {
  const { customTask } = await import('../src/lib/duel/custom')
  const task = customTask(
    'Extract fields',
    '{"x.y":0,"active":false,"empty":null}'
  )
  assert.equal(task.checks.length, 3)
  for (const value of [
    '[]',
    '{}',
    '{"nested":{}}',
    '{"a..b":1}',
    '{"number":1e400}'
  ])
    assert.throws(() => customTask('task', value))
  assert.throws(() => customTask('', '{"x":1}'))
})
