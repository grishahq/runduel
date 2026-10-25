import type { Task } from './types'
// Synthetic documents, with expected outcomes declared separately from agent output.
export const tasks: Task[] = [
  {
    id: 'invoice-usd',
    title: 'Invoice with a currency symbol',
    prompt:
      'Extract invoice_id, total (number), and currency (ISO code) as a JSON object. Document: Invoice INV-104 | Total $120.00 | Currency USD',
    checks: [
      { path: 'invoice_id', equals: 'INV-104' },
      { path: 'total', equals: 120 },
      { path: 'currency', equals: 'USD' }
    ]
  },
  {
    id: 'invoice-eur',
    title: 'Invoice with a decimal amount',
    prompt:
      'Extract invoice_id, total (number), and currency (ISO code) as a JSON object. Document: Invoice INV-205 | Total €89.50 | Currency EUR',
    checks: [
      { path: 'invoice_id', equals: 'INV-205' },
      { path: 'total', equals: 89.5 },
      { path: 'currency', equals: 'EUR' }
    ]
  },
  {
    id: 'invoice-gbp',
    title: 'Invoice with a zero amount',
    prompt:
      'Extract invoice_id, total (number), and currency (ISO code) as a JSON object. Document: Invoice INV-306 | Total £0.00 | Currency GBP',
    checks: [
      { path: 'invoice_id', equals: 'INV-306' },
      { path: 'total', equals: 0 },
      { path: 'currency', equals: 'GBP' }
    ]
  }
]
