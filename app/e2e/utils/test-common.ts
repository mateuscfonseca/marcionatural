/**
 * Helpers comuns para testes E2E
 * 
 * Fornece funções de login/logout e navegação reutilizáveis
 */

import { Page, TestInfo } from '@playwright/test';
import {
  logStep,
  fillWithLog,
  clickWithLog,
  navigateWithLog,
  takeScreenshot,
} from './test-helpers';

/**
 * Realiza login com logs
 *
 * Screenshot de sucesso só é salvo se SAVE_SUCCESS_SCREENSHOTS=true
 */
export async function loginWithLog(
  page: Page,
  testInfo: TestInfo,
  username: string = 'test_user_1',
  password: string = 'teste123'
): Promise<void> {
  await logStep(testInfo, 'Realizando login', '🔐');

  await navigateWithLog(page, testInfo, '/login', 'Página de Login');
  await fillWithLog(page, testInfo, '[data-testid="username-input"]', username, 'Username');
  await fillWithLog(page, testInfo, '[data-testid="password-input"]', password, 'Password');
  await clickWithLog(page, testInfo, '[data-testid="login-button"]', 'Botão Login');
  await page.waitForURL(/\/leaderboard/);

  // Screenshot opcional de sucesso (controlado por SAVE_SUCCESS_SCREENSHOTS)
  await takeScreenshot(page, testInfo, { label: 'login-success', type: 'success' });
}

/**
 * Realiza logout com logs
 *
 * Screenshot de sucesso só é salvo se SAVE_SUCCESS_SCREENSHOTS=true
 */
export async function logoutWithLog(
  page: Page,
  testInfo: TestInfo
): Promise<void> {
  await logStep(testInfo, 'Realizando logout', '🚪');
  await clickWithLog(page, testInfo, '[data-testid="logout-button"]', 'Botão Logout');
  await page.waitForURL('/login');
  // Screenshot opcional de sucesso (controlado por SAVE_SUCCESS_SCREENSHOTS)
  await takeScreenshot(page, testInfo, { label: 'logout-success', type: 'success' });
}

/**
 * Navega para uma tela pelo menu
 */
export async function navigateByMenuWithLog(
  page: Page,
  testInfo: TestInfo,
  menuTestId: string,
  expectedUrl: RegExp,
  screenshotLabel: string
): Promise<void> {
  await logStep(testInfo, `Navegando por ${menuTestId}`, '🧭');
  await clickWithLog(page, testInfo, `[data-testid="${menuTestId}"]`, menuTestId);
  await page.waitForURL(expectedUrl);
  await takeScreenshot(page, testInfo, { label: screenshotLabel, type: 'step' });
}
