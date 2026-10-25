import { test, expect } from '@playwright/test'

test('offline comparison, explicit failure and both exports', async ({
  page
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Good answers'
  )
  await page.getByRole('button', { name: 'Compare runs' }).click()
  await expect(page.getByTestId('baseline-status')).toHaveText('completed')
  await expect(page.getByTestId('candidate-status')).toHaveText('completed')
  await expect(page.getByTestId('baseline-score')).toHaveText('3/3')
  await expect(page.getByTestId('candidate-score')).toHaveText('2/3')
  await expect(page.getByTestId('candidate-answer')).not.toContainText(
    'currency'
  )
  await expect(
    page.getByText('Required field is missing', { exact: false })
  ).toBeVisible()
  await page.screenshot({
    path: 'campaign/assets/03-real-comparison.png',
    fullPage: true
  })
  for (const name of ['JSON', 'HTML']) {
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name, exact: true }).click()
    await (
      await download
    ).saveAs(`docs/evidence/browser-export.${name.toLowerCase()}`)
  }
})
test('retained upstream chat discovers agents, streams tools and persists a session', async ({
  page
}) => {
  await page.goto('/chat')
  await expect(page.getByText('New Chat', { exact: false })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Compare' })).toBeVisible()
  // Upstream agent selector is tested against the actual local AgentOS.
  await expect(page.locator('body')).toContainText('Invoice extractor', {
    timeout: 20000
  })
  await page
    .getByPlaceholder('Ask anything')
    .fill(
      'Extract invoice_id, total (number), and currency (ISO code) as a JSON object. Document: Invoice INV-104 | Total $120.00 | Currency USD'
    )
  await page.getByPlaceholder('Ask anything').press('Enter')
  await expect(page).toHaveURL(/session=/)
  await expect(page.locator('body')).toContainText('"currency": "USD"', {
    timeout: 20000
  })
  await expect(page.locator('body')).toContainText('normalize_currency')
  const sessionUrl = page.url()
  await page.reload()
  await expect(page.locator('body')).toContainText('"currency": "USD"', {
    timeout: 20000
  })
  expect(page.url()).toBe(sessionUrl)
  await page.screenshot({
    path: 'docs/evidence/upstream-chat.png',
    fullPage: true
  })
})
test('live comparison against the pinned real AgentOS', async ({ page }) => {
  await page.goto('/compare')
  await page.getByRole('button', { name: 'Live AgentOS' }).click()
  await page.getByLabel('AgentOS endpoint').fill('http://127.0.0.1:7777')
  await page.getByRole('button', { name: 'Compare runs' }).click()
  await expect(page.getByTestId('baseline-score')).toHaveText('3/3', {
    timeout: 20000
  })
  await expect(page.getByTestId('candidate-score')).toHaveText('2/3')
  await page.screenshot({
    path: 'docs/evidence/live-agentos.png',
    fullPage: true
  })
})
test('mobile layout has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/compare')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true)
  await page.screenshot({ path: 'docs/evidence/mobile.png', fullPage: true })
})

test('malformed live stream produces explicit errors and zero passing checks', async ({
  page
}) => {
  await page.route('**/agents/*/runs', (route) =>
    route.fulfill({
      contentType: 'text/event-stream',
      body: 'data: {broken}\n\n'
    })
  )
  await page.goto('/compare')
  await page.getByRole('button', { name: 'Live AgentOS' }).click()
  await page.getByRole('button', { name: 'Compare runs' }).click()
  await expect(page.getByTestId('baseline-status')).toHaveText('error')
  await expect(page.getByTestId('candidate-status')).toHaveText('error')
  await expect(page.getByTestId('baseline-score')).toHaveText('0/3')
  await expect(
    page.getByText('Malformed JSON in event stream').first()
  ).toBeVisible()
})
test('one side can be cancelled while its peer completes', async ({ page }) => {
  await page.route('**/agents/*/runs', async (route) => {
    const baseline = route.request().url().includes('baseline')
    if (baseline) await new Promise((resolve) => setTimeout(resolve, 1200))
    await route
      .fulfill({
        contentType: 'text/event-stream',
        body: 'data: {"event":"RunCompleted","content":{"invoice_id":"INV-104","total":120,"currency":"USD"}}\n\n'
      })
      .catch(() => {})
  })
  await page.goto('/compare')
  await page.getByRole('button', { name: 'Live AgentOS' }).click()
  await page.getByRole('button', { name: 'Compare runs' }).click()
  await page.getByRole('button', { name: 'Stop baseline' }).click()
  await expect(page.getByTestId('baseline-status')).toHaveText('cancelled')
  await expect(page.getByTestId('candidate-status')).toHaveText('completed')
  await expect(page.getByTestId('candidate-score')).toHaveText('3/3')
})
test('custom task sends identical input and config changes invalidate results', async ({
  page
}) => {
  const inputs: string[] = []
  await page.route('**/agents/*/runs', async (route) => {
    inputs.push(route.request().postData()!)
    await route.fulfill({
      contentType: 'text/event-stream',
      body: 'data: {"event":"RunCompleted","content":{"ready":true}}\n\n'
    })
  })
  await page.goto('/compare')
  await page.getByRole('button', { name: 'Live AgentOS' }).click()
  await page.getByRole('combobox').selectOption('custom')
  await page.getByLabel('Shared task text').fill('Return ready=true as JSON')
  await page.getByLabel('Expected JSON fields').fill('{"ready":true}')
  await page.getByRole('button', { name: 'Compare runs' }).click()
  await expect(page.getByTestId('baseline-score')).toHaveText('1/1')
  await expect(page.getByTestId('candidate-score')).toHaveText('1/1')
  expect(inputs).toHaveLength(2)
  expect(
    inputs.every((input) => input.includes('Return ready=true as JSON'))
  ).toBe(true)
  await page.getByLabel('Candidate agent ID').fill('different-agent')
  await expect(page.getByTestId('candidate-status')).toHaveText('idle')
  await expect(
    page.getByRole('button', { name: 'JSON', exact: true })
  ).toBeDisabled()
})
