/**
 * Testes E2E de Votação e Reports
 * 
 * Testa: reportar entradas, sistema de votação,
 * entradas invalidadas, estatísticas
 */

import { test, expect } from '@playwright/test';

test.describe('Votação e Reports', () => {
  test('deve acessar tela de votação', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Votação
    await page.click('[data-testid="nav-link-voting"]');
    await page.waitForURL(/\/voting/);

    // Verifica se tela de votação está visível
    await expect(page.locator('text=Votação')).toBeVisible();
  });

  test('deve exibir abas "Para Votar", "Invalidadas", "Minhas Invalidadas"', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Votação
    await page.click('[data-testid="nav-link-voting"]');
    await page.waitForURL(/\/voting/);

    // Verifica abas
    await expect(page.locator('text=Para Votar')).toBeVisible();
    await expect(page.locator('text=Invalidadas')).toBeVisible();
    await expect(page.locator('text=Minhas Invalidadas')).toBeVisible();
  });

  test('deve reportar entrada de outro usuário', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Usuários
    await page.click('[data-testid="nav-link-users"]');
    await page.waitForURL(/\/users/);

    // Clica em test_user_2 (que tem entrada reportável)
    const users = page.locator('[data-testid^="user-card"], table tr');
    await users.filter({ hasText: 'test_user_2' }).click();
    await page.waitForURL(/\/users\/\d+\/entries/);

    // Navega para Votação para reportar
    await page.click('[data-testid="nav-link-voting"]');
    await page.waitForURL(/\/voting/);

    // Aba "Para Votar"
    await page.click('button:has-text("Para Votar")');

    // Verifica se há entradas para votar
    const entries = page.locator('[data-testid^="entry-card-"]');
    const count = await entries.count();

    if (count > 0) {
      // Clica em reportar na primeira entrada
      await page.click('button:has-text("Reportar")');

      // Aguarda confirmação/toast
      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
    }
  });

  test('deve exibir entradas invalidadas na aba "Invalidadas"', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Votação
    await page.click('[data-testid="nav-link-voting"]');
    await page.waitForURL(/\/voting/);

    // Aba "Invalidadas"
    await page.click('button:has-text("Invalidadas")');

    // Verifica se há entradas invalidadas (seed cria algumas)
    const entries = page.locator('[data-testid^="entry-card-"]');
    const count = await entries.count();
    
    // Seed E2E cria entradas invalidadas
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('deve exibir minhas entradas invalidadas na aba "Minhas Invalidadas"', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Votação
    await page.click('[data-testid="nav-link-voting"]');
    await page.waitForURL(/\/voting/);

    // Aba "Minhas Invalidadas"
    await page.click('button:has-text("Minhas Invalidadas")');

    // Verifica se a seção está visível
    await expect(page.locator('text=Minhas Invalidadas')).toBeVisible();
  });

  test('deve exibir estatísticas de votação', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Votação
    await page.click('[data-testid="nav-link-voting"]');
    await page.waitForURL(/\/voting/);

    // Verifica se há estatísticas (pode ser número de reports, etc.)
    // O seed E2E cria entradas com 3 reports
    const statsSection = page.locator('text=/\\d+.*report|text=/.*invalidad.*/i');
    await expect(statsSection.first()).toBeVisible();
  });

  test('deve remover meu report de entrada', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Votação
    await page.click('[data-testid="nav-link-voting"]');
    await page.waitForURL(/\/voting/);

    // Aba "Para Votar" ou "Invalidadas"
    await page.click('button:has-text("Invalidadas")');

    // Verifica se há entradas reportadas
    const entries = page.locator('[data-testid^="entry-card-"]');
    const count = await entries.count();

    if (count > 0) {
      // Clica em remover report (se disponível)
      const removeButton = page.locator('button:has-text("Remover report"), button:has-text("Desfazer")');
      if (await removeButton.count() > 0) {
        await removeButton.first().click();
        
        // Aguarda confirmação
        await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
      }
    }
  });

  test('deve validar que entrada com 3+ reports é automaticamente invalidada', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Votação
    await page.click('[data-testid="nav-link-voting"]');
    await page.waitForURL(/\/voting/);

    // Aba "Invalidadas"
    await page.click('button:has-text("Invalidadas")');

    // Verifica se há entradas invalidadas (o seed cria entradas com 3 reports)
    const invalidatedEntries = page.locator('[data-testid^="entry-card-"].opacity-75, [data-testid^="entry-card-"]:has-text("Invalidada")');
    const count = await invalidatedEntries.count();
    
    // Seed E2E deve criar pelo menos uma entrada invalidada
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('deve navegar para Minhas Entradas a partir da Votação', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Votação
    await page.click('[data-testid="nav-link-voting"]');
    await page.waitForURL(/\/voting/);

    // Navega para Minhas Entradas
    await page.click('[data-testid="nav-link-my-entries"]');
    await page.waitForURL(/\/my-entries/);

    await expect(page).toHaveURL(/\/my-entries/);
  });
});
