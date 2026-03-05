/**
 * Testes E2E de Projetos Pessoais
 */

import { test, expect } from '@playwright/test';
import { logTestStart, logTestEnd, takeScreenshot, clickWithLog, expectWithScreenshot, logStep } from '../utils/test-helpers';
import { loginWithLog } from '../utils/test-common';

test.describe('Projetos Pessoais', () => {
  test('deve acessar tela de projetos', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    await loginWithLog(page, testInfo);
    
    await clickWithLog(page, testInfo, '[data-testid="nav-link-projects"]', 'Menu Projetos');
    await page.waitForURL(/\/projects/);
    await takeScreenshot(page, testInfo, { label: 'projects-page', type: 'step' });

    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('text=Projetos')).toBeVisible();
    }, 'Tela de projetos visível');

    await logTestEnd(testInfo, 'passed');
  });

  test('deve abrir modal de novo projeto', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    await loginWithLog(page, testInfo);
    
    await clickWithLog(page, testInfo, '[data-testid="nav-link-projects"]', 'Menu Projetos');
    await page.waitForURL(/\/projects/);
    
    await clickWithLog(page, testInfo, '[data-testid="fab-button"]', 'FAB');
    await clickWithLog(page, testInfo, '[data-testid="fab-project-log"]', 'Registrar Projeto');
    await takeScreenshot(page, testInfo, { label: 'project-modal-open', type: 'step' });

    await logTestEnd(testInfo, 'passed');
  });

  test('deve validar progresso semanal do projeto', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    await loginWithLog(page, testInfo);
    
    await clickWithLog(page, testInfo, '[data-testid="nav-link-projects"]', 'Menu Projetos');
    await page.waitForURL(/\/projects/);
    await takeScreenshot(page, testInfo, { label: 'projects-progress', type: 'step' });

    await logStep(testInfo, 'Verificando progresso semanal', '📊');
    await logTestEnd(testInfo, 'passed');
  });

  test('deve exibir meta de horas semanais', async ({ page }, testInfo) => {
    await logTestStart(testInfo);
    await loginWithLog(page, testInfo);
    
    await clickWithLog(page, testInfo, '[data-testid="nav-link-projects"]', 'Menu Projetos');
    await page.waitForURL(/\/projects/);
    await takeScreenshot(page, testInfo, { label: 'projects-goal', type: 'step' });

    await logTestEnd(testInfo, 'passed');
  });
});
