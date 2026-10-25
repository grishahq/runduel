'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowRight,
  CheckCircle2,
  GitCompareArrows,
  Play,
  Square,
  XCircle
} from 'lucide-react'
import { customTask } from '@/lib/duel/custom'
import { tasks } from '@/lib/duel/tasks'
import { emptyRun, type Comparison, type Run } from '@/lib/duel/types'
import { evaluate, htmlReport, redactedReport } from '@/lib/duel/report'
import { liveRequest, runStream } from '@/lib/duel/run'
import './workspace.css'

function download(name: string, value: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function Compare() {
  const [mode, setMode] = useState<'replay' | 'live'>('replay')
  const [taskId, setTaskId] = useState(tasks[0].id)
  const [endpoint, setEndpoint] = useState('http://localhost:7777')
  const [baseline, setBaseline] = useState('extractor-baseline')
  const [candidate, setCandidate] = useState('extractor-regressed')
  const [prompt, setPrompt] = useState(tasks[0].prompt)
  const [expected, setExpected] = useState(
    '{"invoice_id":"INV-104","total":120,"currency":"USD"}'
  )
  const [token, setToken] = useState('')
  const [runs, setRuns] = useState<[Run, Run]>([
    emptyRun('baseline'),
    emptyRun('candidate')
  ])
  const [comparison, setComparison] = useState<Comparison | null>(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const controllers = useRef<AbortController[]>([])
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      controllers.current.forEach((c) => c.abort())
    }
  }, [])
  let customError = ''
  let task = tasks.find((t) => t.id === taskId) ?? {
    id: 'custom',
    title: 'Custom task',
    prompt,
    checks: []
  }
  if (taskId === 'custom') {
    try {
      task = customTask(prompt, expected)
    } catch (error) {
      customError = (error as Error).message
    }
  }
  function reset() {
    setRuns([emptyRun('baseline'), emptyRun('candidate')])
    setComparison(null)
    setNotice('')
  }
  async function compare() {
    setBusy(true)
    setNotice('')
    setComparison(null)
    const selectedTask = task
    const selectedMode = mode
    const nextControllers = [new AbortController(), new AbortController()]
    controllers.current = nextControllers
    setRuns([emptyRun('baseline'), emptyRun('candidate')])
    try {
      if (customError) throw new Error(customError)
      if (mode === 'live' && (!baseline.trim() || !candidate.trim()))
        throw new Error('Both agent IDs are required')
      const hash = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(selectedTask.prompt)
          )
        )
      )
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
      // Validate both URLs before starting either run.
      const opens = [baseline, candidate].map((id, index) =>
        selectedMode === 'live'
          ? liveRequest(endpoint, id, selectedTask.prompt, token)
          : async (signal: AbortSignal) => {
              const response = await fetch(
                `/fixtures/${selectedTask.id}-${index === 0 ? 'baseline' : 'candidate'}.sse`,
                { signal }
              )
              if (!response.ok || !response.body)
                throw new Error('Recorded fixture could not be loaded')
              const source = response.body.getReader()
              // Real recorded Agno events, paced only for visibility. No model timing claims.
              const body = new ReadableStream<Uint8Array>({
                async pull(controller) {
                  try {
                    if (signal.aborted) {
                      await source.cancel()
                      controller.close()
                      return
                    }
                    const { done, value } = await source.read()
                    if (done) {
                      controller.close()
                      return
                    }
                    await new Promise((resolve) => setTimeout(resolve, 100))
                    if (signal.aborted) {
                      await source.cancel()
                      controller.close()
                      return
                    }
                    controller.enqueue(value)
                  } catch (error) {
                    controller.error(error)
                  }
                },
                cancel() {
                  return source.cancel()
                }
              })
              return new Response(body, {
                headers: { 'content-type': 'text/event-stream' }
              })
            }
      )
      const results = await Promise.all(
        opens.map((open, i) =>
          runStream({
            role: i === 0 ? 'baseline' : 'candidate',
            open,
            signal: nextControllers[i].signal,
            onUpdate: (run) => {
              if (mounted.current)
                setRuns((prev) => (i === 0 ? [run, prev[1]] : [prev[0], run]))
            }
          })
        )
      )
      if (mounted.current)
        setComparison({
          schemaVersion: 1,
          mode: selectedMode,
          task: selectedTask,
          promptSha256: hash,
          runs: [results[0], results[1]]
        })
    } catch (error) {
      if (mounted.current)
        setNotice(error instanceof Error ? error.message : 'Comparison failed')
    } finally {
      if (mounted.current) setBusy(false)
    }
  }
  const hasResult = runs.some((r) => r.status !== 'idle')
  return (
    <div className="duel-shell">
      <nav className="duel-nav">
        <Link href="/compare" className="duel-brand">
          <GitCompareArrows size={25} /> RunDuel <span>EXPERIMENTAL / 0.1</span>
        </Link>
        <div>
          <Link href="/chat">
            Agent UI chat <ArrowRight size={15} />
          </Link>
          <a href="https://github.com/grishahq/runduel">GitHub ↗</a>
        </div>
      </nav>
      <main className="duel-main">
        <header className="duel-intro">
          <p className="duel-eyebrow">
            SAME TASK. TWO CONFIGURATIONS. EXPLICIT CHECKS.
          </p>
          <h1>
            Good answers deserve
            <br />
            <em>a closer comparison.</em>
          </h1>
          <p>
            Run a baseline and a candidate on the same document.
            <br />
            Inspect what changed, then take the evidence with you.
          </p>
        </header>
        <section
          className="duel-controls"
          aria-label="Comparison configuration"
        >
          <div className="duel-section-top">
            <h2>
              <span>01</span> Set up the comparison
            </h2>
            <div className="duel-mode">
              <button
                disabled={busy}
                aria-pressed={mode === 'replay'}
                onClick={() => {
                  setMode('replay')
                  setTaskId(tasks[0].id)
                  setComparison(null)
                  setRuns([emptyRun('baseline'), emptyRun('candidate')])
                }}
              >
                Recorded demo
              </button>
              <button
                disabled={busy}
                aria-pressed={mode === 'live'}
                onClick={() => {
                  setMode('live')
                  setComparison(null)
                  setRuns([emptyRun('baseline'), emptyRun('candidate')])
                }}
              >
                Live AgentOS
              </button>
            </div>
          </div>
          <div className="duel-config-row">
            <label>
              Task
              <select
                disabled={busy}
                value={taskId}
                onChange={(e) => {
                  setTaskId(e.target.value)
                  setComparison(null)
                  setRuns([emptyRun('baseline'), emptyRun('candidate')])
                }}
              >
                {mode === 'live' && (
                  <option value="custom">
                    Custom task with exact JSON checks
                  </option>
                )}
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
            <button className="duel-run" disabled={busy} onClick={compare}>
              <Play size={17} fill="currentColor" />
              {busy ? 'Comparing…' : 'Compare runs'}
            </button>
          </div>
          {mode === 'live' && (
            <div className="duel-live">
              <label>
                AgentOS endpoint
                <input
                  disabled={busy}
                  value={endpoint}
                  onChange={(e) => {
                    setEndpoint(e.target.value)
                    reset()
                  }}
                />
              </label>
              <label>
                Baseline agent ID
                <input
                  disabled={busy}
                  value={baseline}
                  onChange={(e) => {
                    setBaseline(e.target.value)
                    reset()
                  }}
                />
              </label>
              <label>
                Candidate agent ID
                <input
                  disabled={busy}
                  value={candidate}
                  onChange={(e) => {
                    setCandidate(e.target.value)
                    reset()
                  }}
                />
              </label>
              <label>
                Bearer token (memory only)
                <input
                  type="password"
                  autoComplete="off"
                  disabled={busy}
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value)
                    reset()
                  }}
                />
              </label>
            </div>
          )}
          {mode === 'live' && taskId === 'custom' && (
            <div className="duel-custom">
              <label>
                Shared task text
                <textarea
                  disabled={busy}
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value)
                    reset()
                  }}
                />
              </label>
              <label>
                Expected JSON fields (dotted paths, exact scalar values)
                <textarea
                  disabled={busy}
                  value={expected}
                  onChange={(e) => {
                    setExpected(e.target.value)
                    reset()
                  }}
                />
              </label>
              {customError && <p role="alert">{customError}</p>}
            </div>
          )}
          <details className="duel-task">
            <summary>
              Shared input & success criteria{' '}
              <span>{task.checks.length} exact checks</span>
            </summary>
            <pre>{task.prompt}</pre>
            <p>
              Expected JSON:{' '}
              {task.checks
                .map((c) => `${c.path} = ${JSON.stringify(c.equals)}`)
                .join(' · ')}
            </p>
          </details>
          <p className="duel-note">
            {mode === 'replay'
              ? 'Recorded from real Agno 2.5.9 runs with a deterministic offline model. The candidate intentionally skips currency normalization. Replay time is not model performance.'
              : 'Agno 2.5.9 tested. Both agents receive identical text and fresh independent sessions. Your browser connects directly to this endpoint; CORS must allow this origin. Stopping a stream does not guarantee server-side cancellation.'}
          </p>
          {notice && (
            <p role="alert" className="duel-error">
              {notice}
            </p>
          )}
        </section>
        <div className="duel-results-heading">
          <h2>
            <span>02</span> Compare the evidence
          </h2>
          <span>
            {busy
              ? 'Streaming independently'
              : hasResult
                ? 'Inspect checks before choosing a configuration'
                : 'Ready when you are'}
          </span>
        </div>
        <section className="duel-grid" aria-label="Paired results">
          {runs.map((run, index) => {
            const checks = evaluate(run, task.checks)
            const passed = checks.filter((c) => c.passed).length
            return (
              <article
                className={`duel-card ${index === 0 ? 'baseline' : 'candidate'}`}
                key={run.role}
              >
                <div className="duel-card-top">
                  <div>
                    <p>{index === 0 ? 'BASELINE' : 'CANDIDATE'}</p>
                    <h3>
                      {mode === 'replay'
                        ? index === 0
                          ? 'Complete extraction'
                          : 'Normalization removed'
                        : index === 0
                          ? baseline
                          : candidate}
                    </h3>
                  </div>
                  <span
                    className={`duel-status ${run.status}`}
                    data-testid={`${run.role}-status`}
                  >
                    {run.status}
                  </span>
                </div>
                <div className="duel-metrics">
                  <div>
                    <strong data-testid={`${run.role}-score`}>
                      {run.status === 'idle'
                        ? '—'
                        : `${passed}/${checks.length}`}
                    </strong>
                    <span>checks passed</span>
                  </div>
                  <div>
                    <strong>
                      {run.elapsedMs === null ? '—' : `${run.elapsedMs} ms`}
                    </strong>
                    <span>
                      {mode === 'replay'
                        ? 'replay wall time'
                        : 'observed wall time'}
                    </span>
                  </div>
                  <div>
                    <strong>
                      {run.usage.inputTokens === null &&
                      run.usage.outputTokens === null
                        ? 'Unknown'
                        : `${run.usage.inputTokens ?? '?'} / ${run.usage.outputTokens ?? '?'}`}
                    </strong>
                    <span>tokens in / out · cost unknown</span>
                  </div>
                </div>
                <div className="duel-answer">
                  <h4>ANSWER</h4>
                  <pre data-testid={`${run.role}-answer`}>
                    {run.answer ||
                      (run.status === 'idle'
                        ? 'Your agent’s answer will appear here.'
                        : 'Waiting for content…')}
                  </pre>
                </div>
                {run.error && (
                  <p role="alert" className="duel-error">
                    {run.error}
                  </p>
                )}
                <div className="duel-checks">
                  <h4>SUCCESS CRITERIA</h4>
                  {checks.map((c, i) => (
                    <div
                      key={i}
                      className={
                        run.status === 'idle'
                          ? 'pending'
                          : c.passed
                            ? 'pass'
                            : 'fail'
                      }
                    >
                      {c.passed ? (
                        <CheckCircle2 size={17} />
                      ) : (
                        <XCircle size={17} />
                      )}
                      <div>
                        <strong>{c.path}</strong>
                        <span>
                          {run.status === 'idle'
                            ? `Expected ${JSON.stringify(c.expected)}`
                            : c.passed
                              ? c.reason
                              : `${c.reason} · expected ${JSON.stringify(c.expected)}, got ${JSON.stringify(c.actual) ?? 'missing'}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <details className="duel-tools" open>
                  <summary>
                    Tool sequence <span>{run.tools.length} calls</span>
                  </summary>
                  {run.tools.length ? (
                    run.tools.map((tool, i) => (
                      <details key={tool.id}>
                        <summary>
                          <b>{String(i + 1).padStart(2, '0')}</b> {tool.name}
                          <span>{tool.status}</span>
                        </summary>
                        <pre>
                          {JSON.stringify(
                            { arguments: tool.args, result: tool.result },
                            null,
                            2
                          )}
                        </pre>
                      </details>
                    ))
                  ) : (
                    <p>No tool calls observed.</p>
                  )}
                </details>
                {run.status === 'running' && (
                  <button
                    className="duel-stop"
                    onClick={() => controllers.current[index]?.abort()}
                  >
                    <Square size={13} /> Stop {run.role}
                  </button>
                )}
              </article>
            )
          })}
        </section>
        <section className="duel-export">
          <div>
            <h2>
              <span>03</span> Take the evidence with you
            </h2>
            <p>
              Exports keep outcomes, counts and timings. Prompts, answers, tool
              payloads,
              <br />
              errors, credentials and endpoint identifiers are omitted by an
              allowlist.
            </p>
          </div>
          <div>
            <button
              disabled={!comparison || busy}
              onClick={() =>
                comparison &&
                download(
                  'runduel-comparison.json',
                  JSON.stringify(redactedReport(comparison), null, 2),
                  'application/json'
                )
              }
            >
              <ArrowDownToLine size={16} /> JSON
            </button>
            <button
              disabled={!comparison || busy}
              onClick={() =>
                comparison &&
                download(
                  'runduel-comparison.html',
                  htmlReport(comparison),
                  'text/html'
                )
              }
            >
              <ArrowDownToLine size={16} /> HTML
            </button>
          </div>
        </section>
        <footer>
          Built on{' '}
          <a href="https://github.com/agno-agi/agent-ui">Agno Agent UI</a> · MIT
          licensed fork · Exact checks establish these task outcomes, not
          general model quality.
        </footer>
      </main>
    </div>
  )
}
