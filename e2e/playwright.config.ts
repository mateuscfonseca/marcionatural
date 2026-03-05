import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração do Playwright para testes E2E do Marcio Natural
 * 
 * Uso:
 *   bun run e2e           # Rodar todos os testes (headless)
 *   bun run e2e:ui        # Interface interativa
 *   bun run e2e:headed    # Browser visível
 *   bun run e2e:debug     # Debug passo-a-passo
 *   bun run e2e:report    # Abrir relatório HTML
 */
export default defineConfig({
  testDir: './tests',

  // Timeout por teste
  timeout: 60 * 1000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Rodar testes em paralelo
  fullyParallel: false,

  // Fail a build on CI if test left any .snapshots or .tmp files
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 1,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : 1,

  // Reporter
  reporter: [
    ['html', { outputFolder: './playwright-report', open: 'never' }],
    ['list'],
    ['./custom-reporter.ts'],
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL para todas as requisições
    baseURL: process.env.BASE_URL || 'http://localhost:9000',

    // Screenshot em TODOS os testes
    screenshot: {
      mode: 'on',
      fullPage: true,
    },

    // Vídeo de TODOS os testes
    video: {
      mode: 'on',
      size: { width: 1280, height: 720 },
    },

    // Trace completo para debug (on, off, on-first-retry, on-all-retries, retain-on-failure)
    trace: 'retain-on-failure',

    // Actionability checks
    actionTimeout: 15000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Projetos de browser
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Teste mobile
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Pasta de saída
  outputDir: './test-results',

  // Pasta para snapshots
  snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}{ext}',
});
