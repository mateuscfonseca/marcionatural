/**
 * Testes E2E de Usuários
 */

import { test, expect } from '@playwright/test';
import { logTestStart, logTestEnd, takeScreenshot, clickWithLog, expectWithScreenshot } from '../utils/test-helpers';
import { loginWithLog } from '../utils/test-common';

test.describe('Usuários', () => {
  test('deve listar todos os usuários ativos', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    await loginWithLog(page, testInfo);
    
    await clickWithLog(page, testInfo, '[data-testid="nav-link-users"]', 'Menu Usuários');
    await page.waitForURL(/\/users/);
    await takeScreenshot(page, testInfo, { label: 'users-list', type: 'step' });

    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('[data-testid^="user-card"], table tr').first()).toBeVisible();
    }, 'Usuários listados');

    await logTestEnd(testInfo, 'passed');
  });

  test('deve navegar para entradas de usuário ao clicar', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    await loginWithLog(page, testInfo);
    
    await clickWithLog(page, testInfo, '[data-testid="nav-link-users"]', 'Menu Usuários');
    await page.waitForURL(/\/users/);
    
    const users = page.locator('[data-testid^="user-card"], table tr');
    await clickWithLog(page, testInfo, 'table tr >> nth=1', 'Segundo usuário');
    
    await expectWithScreenshot(page, testInfo, async () => {
      await page.waitForURL(/\/users\/\d+\/entries/);
      await expect(page).toHaveURL(/\/users\/\d+\/entries/);
    }, 'Navegou para entradas do usuário');

    await logTestEnd(testInfo, 'passed');
  });

  test('deve exibir cards em mobile e tabela em desktop', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginWithLog(page, testInfo);
    await clickWithLog(page, testInfo, '[data-testid="nav-link-users"]', 'Menu Usuários');
    await takeScreenshot(page, testInfo, { label: 'users-desktop', type: 'step' });

    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await takeScreenshot(page, testInfo, { label: 'users-mobile', type: 'step' });

    await logTestEnd(testInfo, 'passed');
  });
});
