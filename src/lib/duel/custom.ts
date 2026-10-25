import type { Task } from './types'
/** JSON object maps dotted field paths to exact scalar expected values. */
export function customTask(prompt: string, expected: string): Task {
  if (!prompt.trim() || prompt.length > 50000)
    throw new Error('Custom task must contain 1–50,000 characters')
  let values: unknown
  try {
    values = JSON.parse(expected)
  } catch {
    throw new Error('Expected fields must be a JSON object')
  }
  if (!values || typeof values !== 'object' || Array.isArray(values))
    throw new Error('Expected fields must be a JSON object')
  const entries = Object.entries(values)
  if (!entries.length || entries.length > 50)
    throw new Error('Specify 1–50 exact field checks')
  const checks = entries.map(([path, equals]) => {
    if (!path || path.length > 200 || path.split('.').some((part) => !part))
      throw new Error('Field paths must be nonempty dotted paths')
    if (
      equals !== null &&
      !['string', 'number', 'boolean'].includes(typeof equals)
    )
      throw new Error(
        'Expected values must be strings, numbers, booleans or null'
      )
    if (typeof equals === 'number' && !Number.isFinite(equals))
      throw new Error('Expected numbers must be finite')
    return { path, equals: equals as string | number | boolean | null }
  })
  return { id: 'custom', title: 'Custom task', prompt, checks }
}
