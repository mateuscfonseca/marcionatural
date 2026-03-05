/**
 * Testes E2E de Navegação e Rotas Protegidas
 */

import { test, expect } from '@playwright/test';
import { logTestStart, logTestEnd, takeScreenshot, clickWithLog, expectWithScreenshot, logStep } from '../utils/test-helpers';
import { loginWithLog } from '../utils/test-common';

test.describe('Navegação', () => {
  test('deve abrir e fechar sidebar em mobile', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    
    await page.setViewportSize({ width: 375, height: 667 });
    await loginWithLog(page, testInfo);
    
    await clickWithLog(page, testInfo, '[data-testid="menu-button"]', 'Botão Menu');
    await takeScreenshot(page, testInfo, { label: 'sidebar-open', type: 'step' });
    
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    }, 'Sidebar visível');

    await clickWithLog(page, testInfo, '[data-testid="sidebar-overlay"]', 'Overlay');
    await takeScreenshot(page, testInfo, { label: 'sidebar-closed', type: 'step' });

    await logTestEnd(testInfo, 'passed');
  });

  test('deve navegar para todas as telas pelo menu', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    await loginWithLog(page, testInfo);

    const routes = [
      { name: 'Leaderboard', path: /\/leaderboard/, testId: 'nav-link-leaderboard' },
      { name: 'Timeline', path: /\/timeline/, testId: 'nav-link-timeline' },
      { name: 'Minhas Entradas', path: /\/my-entries/, testId: 'nav-link-my-entries' },
      { name: 'Votação', path: /\/voting/, testId: 'nav-link-voting' },
      { name: 'Projetos', path: /\/projects/, testId: 'nav-link-projects' },
      { name: 'Usuários', path: /\/users/, testId: 'nav-link-users' },
    ];

    for (const route of routes) {
      await logStep(testInfo, `Navegando para ${route.name}`, '🧭');
      await clickWithLog(page, testInfo, `[data-testid="${route.testId}"]`, route.name);
      await page.waitForURL(route.path);
      await takeScreenshot(page, testInfo, { label: `nav-${route.name.toLowerCase()}`, type: 'step' });
    }

    await logTestEnd(testInfo, 'passed');
  });

  test('deve exibir FAB em todas as telas', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    await loginWithLog(page, testInfo);

    const screens = ['/leaderboard', '/timeline', '/my-entries', '/projects', '/users'];

    for (const screen of screens) {
      await page.goto(screen);
      await page.waitForTimeout(500);
      await takeScreenshot(page, testInfo, { label: `fab-${screen.replace('/', '')}`, type: 'step' });
      
      await expectWithScreenshot(page, testInfo, async () => {
        await expect(page.locator('[data-testid="fab-button"]')).toBeVisible();
      }, `FAB visível em ${screen}`);
    }

    await logTestEnd(testInfo, 'passed');
  });

  test('deve abrir menu de opções do FAB', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    await loginWithLog(page, testInfo);
    
    await clickWithLog(page, testInfo, '[data-testid="fab-button"]', 'FAB');
    await takeScreenshot(page, testInfo, { label: 'fab-options', type: 'step' });

    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('[data-testid="fab-new-entry"]')).toBeVisible();
      await expect(page.locator('[data-testid="fab-project-log"]')).toBeVisible();
    }, 'Opções do FAB visíveis');

    await logTestEnd(testInfo, 'passed');
  });

  test('deve exibir mensagens toast de sucesso', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    await loginWithLog(page, testInfo);
    
    await clickWithLog(page, testInfo, '[data-testid="nav-link-my-entries"]', 'Menu Minhas Entradas');
    await page.waitForURL(/\/my-entries/);
    
    await clickWithLog(page, testInfo, '[data-testid="fab-button"]', 'FAB');
    await clickWithLog(page, testInfo, '[data-testid="fab-new-entry"]', 'Nova Entrada');
    
    await page.click('[data-testid="activity-type-select"]');
    await page.click('[data-testid="activity-type-option-Alimentacao Limpa"]');
    await page.fill('[data-testid="description-input"]', 'Teste toast E2E');
    await page.fill('[data-testid="date-input"]', new Date().toISOString().split('T')[0]!);
    await clickWithLog(page, testInfo, '[data-testid="submit-entry-button"]', 'Submit');
    
    await takeScreenshot(page, testInfo, { label: 'toast-success', type: 'success' });

    await logTestEnd(testInfo, 'passed');
  });

  test('deve redirecionar para login ao tentar acessar rota protegida', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    const protectedRoutes = ['/leaderboard', '/timeline', '/my-entries', '/projects', '/users', '/voting'];

    for (const route of protectedRoutes) {
      await logStep(testInfo, `Tentando acessar ${route} sem auth`, '🚫');
      await page.goto(route);
      await page.waitForURL('/login');
      await takeScreenshot(page, testInfo, { label: `protected-${route.replace('/', '')}`, type: 'step' });
    }

    await logTestEnd(testInfo, 'passed');
  });

  test('deve exibir header com nome do usuário', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    await loginWithLog(page, testInfo);
    await takeScreenshot(page, testInfo, { label: 'header-user', type: 'step' });

    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('text=test_user_1')).toBeVisible();
      await expect(page.locator('[data-testid="logout-button"]')).toBeVisible();
    }, 'Header com usuário e logout visíveis');

    await logTestEnd(testInfo, 'passed');
  });
});
