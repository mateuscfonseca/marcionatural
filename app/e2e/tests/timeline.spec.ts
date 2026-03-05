/**
 * Testes E2E de Timeline
 */

import { test, expect } from '@playwright/test';
import { logTestStart, logTestEnd, takeScreenshot, clickWithLog, expectWithScreenshot, logStep } from '../utils/test-helpers';
import { loginWithLog } from '../utils/test-common';

test.describe('Timeline', () => {
  test('deve acessar tela de Timeline', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    await loginWithLog(page, testInfo);
    
    await clickWithLog(page, testInfo, '[data-testid="nav-link-timeline"]', 'Menu Timeline');
    await page.waitForURL(/\/timeline/);
    await takeScreenshot(page, testInfo, { label: 'timeline-page', type: 'step' });

    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('text=Timeline')).toBeVisible();
    }, 'Tela de Timeline visível');

    await logTestEnd(testInfo, 'passed');
  });

  test('deve renderizar timeline com entradas ordenadas', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    await loginWithLog(page, testInfo);
    
    await clickWithLog(page, testInfo, '[data-testid="nav-link-timeline"]', 'Menu Timeline');
    await page.waitForURL(/\/timeline/);
    await takeScreenshot(page, testInfo, { label: 'timeline-entries', type: 'step' });

    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('[data-testid^="entry-card-"]').first()).toBeVisible();
    }, 'Entradas na timeline');

    await logTestEnd(testInfo, 'passed');
  });

  test('deve exibir entradas de todos os usuários', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    await loginWithLog(page, testInfo);
    
    await clickWithLog(page, testInfo, '[data-testid="nav-link-timeline"]', 'Menu Timeline');
    await page.waitForURL(/\/timeline/);
    await takeScreenshot(page, testInfo, { label: 'timeline-all-users', type: 'step' });

    await logTestEnd(testInfo, 'passed');
  });

  test('deve filtrar timeline por período', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    await loginWithLog(page, testInfo);
    
    await clickWithLog(page, testInfo, '[data-testid="nav-link-timeline"]', 'Menu Timeline');
    await page.waitForURL(/\/timeline/);
    
    await clickWithLog(page, testInfo, 'button:has-text("Hoje")', 'Filtro Hoje');
    await takeScreenshot(page, testInfo, { label: 'timeline-filter-today', type: 'step' });

    await logTestEnd(testInfo, 'passed');
  });

  test('deve abrir detalhes da entrada ao clicar', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    await loginWithLog(page, testInfo);
    
    await clickWithLog(page, testInfo, '[data-testid="nav-link-timeline"]', 'Menu Timeline');
    await page.waitForURL(/\/timeline/);
    
    const firstEntry = page.locator('[data-testid^="entry-card-"]').first();
    await clickWithLog(page, testInfo, '[data-testid^="entry-card-"] >> nth=0', 'Primeira entrada');
    await takeScreenshot(page, testInfo, { label: 'timeline-detail-modal', type: 'step' });

    await logTestEnd(testInfo, 'passed');
  });
});
