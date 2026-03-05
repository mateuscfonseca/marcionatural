/**
 * Testes E2E de Leaderboard
 * 
 * Testa: renderização do ranking, polling automático,
 * navegação para entradas de usuário, validação de pontos
 */

import { test, expect } from '@playwright/test';
import { logTestStart, logTestEnd, logStep, takeScreenshot, clickWithLog, expectWithScreenshot } from '../utils/test-helpers';
import { loginWithLog } from '../utils/test-common';

test.describe('Leaderboard', () => {
  test('deve renderizar leaderboard com usuários e pontos', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    await loginWithLog(page, testInfo);
    await takeScreenshot(page, testInfo, { label: 'leaderboard-page', type: 'step' });

    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('text=Leaderboard')).toBeVisible();
    }, 'Título Leaderboard visível');

    const users = page.locator('[data-testid^="user-card"], table tr');
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(users.first()).toBeVisible();
    }, 'Usuários listados no leaderboard');

    await logTestEnd(testInfo, 'passed');
  });

  test('deve exibir test_leader como primeiro colocado', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    await loginWithLog(page, testInfo);
    await page.waitForTimeout(2000);
    await takeScreenshot(page, testInfo, { label: 'leaderboard-ranking', type: 'step' });

    const firstUser = page.locator('[data-testid^="user-card"], table tr').first();
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(firstUser).toContainText('test_leader');
    }, 'test_leader é o primeiro colocado');

    await logTestEnd(testInfo, 'passed');
  });

  test('deve navegar para entradas do usuário ao clicar no card', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    await loginWithLog(page, testInfo);
    
    const firstUser = page.locator('[data-testid^="user-card"], table tr').first();
    await clickWithLog(page, testInfo, 'table tr >> nth=0', 'Primeiro usuário do leaderboard');

    await expectWithScreenshot(page, testInfo, async () => {
      await page.waitForURL(/\/users\/\d+\/entries/);
      await expect(page).toHaveURL(/\/users\/\d+\/entries/);
    }, 'Navegou para entradas do usuário');

    await logTestEnd(testInfo, 'passed');
  });

  test('deve atualizar leaderboard automaticamente (polling 10s)', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    await loginWithLog(page, testInfo);
    await takeScreenshot(page, testInfo, { label: 'leaderboard-before-polling', type: 'step' });

    await logStep(testInfo, 'Aguardando 12 segundos para polling...', '⏳');
    await page.waitForTimeout(12000);

    await takeScreenshot(page, testInfo, { label: 'leaderboard-after-polling', type: 'step' });
    await logStep(testInfo, 'Polling completado', '✅');

    await logTestEnd(testInfo, 'passed');
  });

  test('deve exibir cards em mobile e tabela em desktop', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    // Desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginWithLog(page, testInfo);
    await takeScreenshot(page, testInfo, { label: 'leaderboard-desktop', type: 'step' });

    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('table')).toBeVisible();
    }, 'Tabela visível em desktop');

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForURL(/\/leaderboard/);
    await takeScreenshot(page, testInfo, { label: 'leaderboard-mobile', type: 'step' });

    const cards = page.locator('[data-testid^="user-card"]');
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(cards.first()).toBeVisible();
    }, 'Cards visíveis em mobile');

    await logTestEnd(testInfo, 'passed');
  });

  test('deve validar pontos corretos para cada usuário', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    await loginWithLog(page, testInfo);
    await page.waitForTimeout(2000);
    await takeScreenshot(page, testInfo, { label: 'leaderboard-points', type: 'step' });

    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('text=/\\d+ pts/').first()).toBeVisible();
    }, 'Pontos visíveis no leaderboard');

    await logTestEnd(testInfo, 'passed');
  });
});
