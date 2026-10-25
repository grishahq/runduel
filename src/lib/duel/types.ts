export type Check = { path: string; equals: string | number | boolean | null }
export type Task = {
  id: string
  title: string
  prompt: string
  checks: Check[]
}
export type AgnoEvent = { event: string; [key: string]: unknown }
export type Tool = {
  id: string
  name: string
  args: unknown
  result: unknown
  status: 'running' | 'completed' | 'error'
}
export type Run = {
  role: 'baseline' | 'candidate'
  status: 'idle' | 'running' | 'completed' | 'error' | 'cancelled'
  answer: string
  tools: Tool[]
  error: string | null
  elapsedMs: number | null
  usage: { inputTokens: number | null; outputTokens: number | null }
  events: number
}
export type CheckResult = {
  path: string
  passed: boolean
  expected: unknown
  actual: unknown
  reason: string
}
export type Comparison = {
  schemaVersion: 1
  mode: 'replay' | 'live'
  task: Task
  promptSha256: string
  runs: [Run, Run]
}
export function emptyRun(role: Run['role']): Run {
  return {
    role,
    status: 'idle',
    answer: '',
    tools: [],
    error: null,
    elapsedMs: null,
    usage: { inputTokens: null, outputTokens: null },
    events: 0
  }
}
