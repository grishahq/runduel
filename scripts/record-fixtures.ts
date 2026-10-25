import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tasks } from '../src/lib/duel/tasks'
import { runStream } from '../src/lib/duel/run'
import { evaluate } from '../src/lib/duel/report'

async function main() {
  await mkdir('public/fixtures', { recursive: true })
  const records = []
  for (const task of tasks) {
    for (const role of ['baseline', 'candidate'] as const) {
      const form = new FormData()
      form.set('message', task.prompt)
      form.set('stream', 'true')
      form.set(
        'session_id',
        `runduel-evidence-${task.id}-${role}-${crypto.randomUUID()}`
      )
      const started = performance.now()
      const response = await fetch(
        `http://127.0.0.1:7777/agents/extractor-${role === 'baseline' ? 'baseline' : 'regressed'}/runs`,
        { method: 'POST', body: form }
      )
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const raw = await response.text()
      // No external model was called: Agno's internal zero-token counters are not
      // provider usage. Remove token counters in replay, and record this transform.
      const normalized = raw.replace(
        /^data: (.+)$/gm,
        (_line, value: string) => {
          const event = JSON.parse(value)
          if (event.metrics) {
            for (const key of Object.keys(event.metrics))
              if (key.includes('token')) delete event.metrics[key]
          }
          return `data: ${JSON.stringify(event)}`
        }
      )
      const path = `public/fixtures/${task.id}-${role}.sse`
      await writeFile(path, normalized)
      const run = await runStream({
        role,
        signal: new AbortController().signal,
        onUpdate() {},
        open: async () =>
          new Response(normalized, {
            headers: { 'content-type': 'text/event-stream' }
          })
      })
      const checks = evaluate(run, task.checks)
      if (
        run.status !== 'completed' ||
        checks.filter((c) => c.passed).length !== (role === 'baseline' ? 3 : 2)
      )
        throw new Error(`Unexpected outcome: ${JSON.stringify(run)}`)
      records.push({
        taskId: task.id,
        role,
        promptSha256: createHash('sha256').update(task.prompt).digest('hex'),
        fixture: path,
        fixtureSha256: createHash('sha256').update(normalized).digest('hex'),
        status: run.status,
        answer: JSON.parse(run.answer),
        checks,
        tools: run.tools.map((t) => ({ name: t.name, status: t.status })),
        captureWallMs: Math.round(performance.now() - started)
      })
    }
  }
  await writeFile(
    'docs/evidence/fixed-suite.json',
    JSON.stringify(
      {
        agnoVersion: '2.5.9',
        model: 'runduel-deterministic-v1',
        externalModelCalls: 0,
        method:
          'Three declared synthetic tasks; baseline executes extraction and normalization; intentionally regressed candidate skips normalization. Exact typed field checks declared before capture. One paired run per task. Capture wall times include HTTP, tool execution and artificial 30ms per model chunk; not a speed comparison.',
        fixtureTransform:
          'Removed token counters from deterministic-model metrics: no provider usage exists. Other events preserved.',
        recordedAt: new Date().toISOString(),
        records
      },
      null,
      2
    ) + '\n'
  )
  console.log(`Recorded and checked ${records.length} real AgentOS streams`)
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
