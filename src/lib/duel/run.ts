import { readEvents } from './sse'
import { emptyRun, type AgnoEvent, type Run } from './types'
const text = (value: unknown) =>
  typeof value === 'string' ? value : (JSON.stringify(value) ?? '')
const number = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

export function applyEvent(run: Run, event: AgnoEvent): Run {
  // A completion after cancellation is not a successful run.
  if (run.status !== 'running') return run
  const next: Run = {
    ...run,
    tools: run.tools.map((t) => ({ ...t })),
    events: run.events + 1
  }
  if (event.event === 'RunContent') {
    if (event.content != null) next.answer += text(event.content)
  }
  if (
    event.event === 'ToolCallStarted' ||
    event.event === 'ToolCallCompleted'
  ) {
    const tool = object(event.tool)
    if (
      typeof tool.tool_call_id !== 'string' ||
      typeof tool.tool_name !== 'string'
    )
      throw new Error('Malformed tool event')
    const index = next.tools.findIndex((t) => t.id === tool.tool_call_id)
    const item = {
      id: tool.tool_call_id,
      name: tool.tool_name,
      args: tool.tool_args,
      result: tool.result ?? tool.content,
      status: tool.tool_call_error
        ? ('error' as const)
        : event.event === 'ToolCallCompleted'
          ? ('completed' as const)
          : ('running' as const)
    }
    if (index < 0) next.tools.push(item)
    else next.tools[index] = item
  }
  if (event.event === 'RunCancelled') next.status = 'cancelled'
  if (event.event === 'RunError' || event.event === 'RunPaused') {
    next.status = 'error'
    next.error =
      event.event === 'RunPaused'
        ? 'Run paused: interactive approval is outside v0.1 support'
        : text(event.content ?? event.error ?? 'Agent reported an error')
  }
  if (event.event === 'RunCompleted') {
    const status = String(event.status ?? '').toUpperCase()
    next.status = status.includes('CANCEL')
      ? 'cancelled'
      : status.includes('ERROR') || status.includes('FAIL')
        ? 'error'
        : 'completed'
    if (next.status === 'error')
      next.error = 'Agent completed with an error status'
    if (event.content != null) next.answer = text(event.content)
    const metrics = object(event.metrics)
    next.usage = {
      inputTokens: number(metrics.input_tokens),
      outputTokens: number(metrics.output_tokens)
    }
  }
  if (next.answer.length > 1024 * 1024)
    throw new Error('Answer exceeds 1 MiB limit')
  return next
}

export async function runStream(options: {
  role: Run['role']
  open: (signal: AbortSignal) => Promise<Response>
  signal: AbortSignal
  onUpdate: (run: Run) => void
  timeoutMs?: number
}): Promise<Run> {
  let run: Run = { ...emptyRun(options.role), status: 'running' }
  const started = performance.now()
  const controller = new AbortController()
  let timedOut = false
  const cancel = () => controller.abort()
  options.signal.addEventListener('abort', cancel, { once: true })
  if (options.signal.aborted) controller.abort()
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, options.timeoutMs ?? 120000)
  options.onUpdate(run)
  try {
    const response = await options.open(controller.signal)
    if (!response.ok)
      throw new Error(`AgentOS returned HTTP ${response.status}`)
    if (!response.headers.get('content-type')?.includes('text/event-stream'))
      throw new Error('Expected an AgentOS SSE response')
    if (!response.body) throw new Error('Missing response stream')
    await readEvents(
      response.body,
      (event) => {
        run = applyEvent(run, event)
        run.elapsedMs = Math.round(performance.now() - started)
        options.onUpdate(run)
        return run.status === 'running'
      },
      controller.signal
    )
    if (run.status === 'running')
      throw new Error('Stream ended without a terminal event')
  } catch (error) {
    run = {
      ...run,
      status: controller.signal.aborted && !timedOut ? 'cancelled' : 'error',
      error: timedOut
        ? 'Run timed out after the configured limit'
        : controller.signal.aborted
          ? null
          : error instanceof Error
            ? error.message
            : 'Run failed'
    }
  } finally {
    clearTimeout(timer)
    options.signal.removeEventListener('abort', cancel)
  }
  run.elapsedMs = Math.round(performance.now() - started)
  options.onUpdate(run)
  return run
}

export function liveRequest(
  endpoint: string,
  agentId: string,
  prompt: string,
  token: string
) {
  const url = new URL(endpoint)
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      'Use an HTTP(S) AgentOS URL without credentials, query or fragment'
    )
  return (signal: AbortSignal) => {
    const body = new FormData()
    body.set('message', prompt)
    body.set('stream', 'true')
    body.set('session_id', crypto.randomUUID())
    return fetch(
      `${endpoint.replace(/\/$/, '')}/agents/${encodeURIComponent(agentId)}/runs`,
      {
        method: 'POST',
        body,
        signal,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }
    )
  }
}
