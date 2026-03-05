/**
 * Testes E2E de Votação e Reports
 */

import { test, expect } from '@playwright/test';
import { logTestStart, logTestEnd, takeScreenshot, clickWithLog, expectWithScreenshot, logStep } from '../utils/test-helpers';
import { loginWithLog } from '../utils/test-common';

test.describe('Votação e Reports', () => {
  test('deve acessar tela de votação', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    await loginWithLog(page, testInfo);
    
    await clickWithLog(page, testInfo, '[data-testid="nav-link-voting"]', 'Menu Votação');
    await page.waitForURL(/\/voting/);
    await takeScreenshot(page, testInfo, { label: 'voting-page', type: 'step' });

    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('text=Votação')).toBeVisible();
    }, 'Tela de votação visível');

    await logTestEnd(testInfo, 'passed');
  });

  test('deve exibir abas Para Votar, Invalidadas, Minhas Invalidadas', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    await loginWithLog(page, testInfo);
    
    await clickWithLog(page, testInfo, '[data-testid="nav-link-voting"]', 'Menu Votação');
    await page.waitForURL(/\/voting/);
    await takeScreenshot(page, testInfo, { label: 'voting-tabs', type: 'step' });

    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('text=Para Votar')).toBeVisible();
      await expect(page.locator('text=Invalidadas')).toBeVisible();
      await expect(page.locator('text=Minhas Invalidadas')).toBeVisible();
    }, 'Todas abas visíveis');

    await logTestEnd(testInfo, 'passed');
  });

  test('deve exibir entradas invalidadas na aba Invalidadas', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    await loginWithLog(page, testInfo);
    
    await clickWithLog(page, testInfo, '[data-testid="nav-link-voting"]', 'Menu Votação');
    await page.waitForURL(/\/voting/);
    
    await clickWithLog(page, testInfo, 'button:has-text("Invalidadas")', 'Aba Invalidadas');
    await takeScreenshot(page, testInfo, { label: 'voting-invalidated', type: 'step' });

    await logTestEnd(testInfo, 'passed');
  });

  test('deve exibir estatísticas de votação', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    await loginWithLog(page, testInfo);
    
    await clickWithLog(page, testInfo, '[data-testid="nav-link-voting"]', 'Menu Votação');
    await page.waitForURL(/\/voting/);
    await takeScreenshot(page, testInfo, { label: 'voting-stats', type: 'step' });

    await logTestEnd(testInfo, 'passed');
  });
});
