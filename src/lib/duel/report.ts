import type { Check, CheckResult, Comparison, Run } from './types'
export function evaluate(run: Run, checks: Check[]): CheckResult[] {
  let answer: unknown
  try {
    answer = JSON.parse(run.answer)
  } catch {
    answer = undefined
  }
  return checks.map((check) => {
    let actual = answer
    for (const key of check.path.split('.')) {
      actual =
        actual && typeof actual === 'object' && Object.hasOwn(actual, key)
          ? (actual as Record<string, unknown>)[key]
          : undefined
    }
    const passed =
      run.status === 'completed' &&
      actual !== undefined &&
      actual === check.equals
    return {
      path: check.path,
      passed,
      expected: check.equals,
      actual,
      reason:
        run.status !== 'completed'
          ? 'Run did not complete successfully'
          : answer === undefined
            ? 'Answer is not a JSON object'
            : actual === undefined
              ? 'Required field is missing'
              : passed
                ? 'Exact value matches'
                : 'Value or type differs'
    }
  })
}
/** Allowlist export: no free text, agent IDs, URLs, session IDs, raw events, arguments or results. */
export function redactedReport(comparison: Comparison) {
  return {
    schemaVersion: 1,
    redaction:
      'allowlist-v1: task text, criteria text/values, answers, tools, errors, endpoints and identifiers omitted',
    mode: comparison.mode,
    promptSha256: /^[a-f0-9]{64}$/.test(comparison.promptSha256)
      ? comparison.promptSha256
      : null,
    latencyMeaning:
      comparison.mode === 'replay'
        ? 'Browser replay wall time; not agent or model performance'
        : 'Client-observed wall time including transport; not provider latency',
    runs: comparison.runs.map((run) => ({
      role: run.role,
      status: run.status,
      elapsedMs: run.elapsedMs,
      usage: run.usage,
      cost: null,
      eventCount: run.events,
      tools: run.tools.map((t, i) => ({ sequence: i + 1, status: t.status })),
      checks: evaluate(run, comparison.task.checks).map((c, i) => ({
        criterion: i + 1,
        passed: c.passed,
        reason: c.reason
      }))
    }))
  }
}
export function htmlReport(comparison: Comparison) {
  // Data is escaped even though the allowlist excludes all uncontrolled strings.
  const escaped = JSON.stringify(redactedReport(comparison), null, 2)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>RunDuel redacted comparison</title><style>body{background:#101b2d;color:#edf4f8;font:16px system-ui;max-width:900px;margin:40px auto;padding:24px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#19283b;padding:24px;border-radius:16px}h1{color:#a9eed4}</style><h1>RunDuel comparison</h1><p>Experimental v0.1 · Redacted evidence export. Criterion numbers refer to the original local comparison. Unknown cost is null.</p><pre>${escaped}</pre></html>`
}
