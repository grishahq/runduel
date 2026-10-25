import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: 'tests/browser',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3107',
    viewport: { width: 1440, height: 1100 }
  },
  webServer: {
    command: 'pnpm exec next start -p 3107',
    url: 'http://127.0.0.1:3107',
    reuseExistingServer: !process.env.CI
  },
  reporter: [
    ['list'],
    ['json', { outputFile: 'docs/evidence/browser-results.json' }]
  ]
})
