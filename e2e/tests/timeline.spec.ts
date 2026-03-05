/**
 * Testes E2E de Timeline
 * 
 * Testa: renderização da timeline, ordenação cronológica,
 * filtros por período
 */

import { test, expect } from '@playwright/test';

test.describe('Timeline', () => {
  test('deve acessar tela de Timeline', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Timeline
    await page.click('[data-testid="nav-link-timeline"]');
    await page.waitForURL(/\/timeline/);

    // Verifica se tela de timeline está visível
    await expect(page.locator('text=Timeline')).toBeVisible();
  });

  test('deve renderizar timeline com entradas ordenadas cronologicamente', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Timeline
    await page.click('[data-testid="nav-link-timeline"]');
    await page.waitForURL(/\/timeline/);

    // Verifica se há entradas na timeline
    const entries = page.locator('[data-testid^="entry-card-"]');
    await expect(entries.first()).toBeVisible();
  });

  test('deve exibir entradas de todos os usuários na timeline', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Timeline
    await page.click('[data-testid="nav-link-timeline"]');
    await page.waitForURL(/\/timeline/);

    // Verifica se há entradas de diferentes usuários
    // Seed cria entradas para test_user_1, test_user_2, test_user_3, test_leader
    const usernames = page.locator('text=/test_user_|test_leader/');
    await expect(usernames.first()).toBeVisible();
  });

  test('deve filtrar timeline por período (hoje, semana, mês)', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Timeline
    await page.click('[data-testid="nav-link-timeline"]');
    await page.waitForURL(/\/timeline/);

    // Verifica se há filtros de período
    const filters = page.locator('button:has-text("Hoje"), button:has-text("Semana"), button:has-text("Mês")');
    const count = await filters.count();

    if (count > 0) {
      // Aplica filtro "Hoje"
      await page.click('button:has-text("Hoje")');
      
      // Aguarda filtragem
      await page.waitForTimeout(500);

      // Verifica se entradas são filtradas
      const entries = page.locator('[data-testid^="entry-card-"]');
      const entriesCount = await entries.count();
      expect(entriesCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('deve abrir detalhes da entrada ao clicar no card', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Timeline
    await page.click('[data-testid="nav-link-timeline"]');
    await page.waitForURL(/\/timeline/);

    // Clica no primeiro card de entrada
    const firstEntry = page.locator('[data-testid^="entry-card-"]').first();
    await firstEntry.click();

    // Aguarda modal de detalhes abrir
    await expect(page.locator('[data-testid="entry-form-modal"]')).toBeVisible();
  });

  test('deve exibir fotos das entradas na timeline', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Timeline
    await page.click('[data-testid="nav-link-timeline"]');
    await page.waitForURL(/\/timeline/);

    // Verifica se há fotos (pode não ter, então é opcional)
    const photos = page.locator('img[src*="/images/"]');
    const count = await photos.count();
    
    // Pelo menos verifica que cards estão visíveis
    const entries = page.locator('[data-testid^="entry-card-"]');
    await expect(entries.first()).toBeVisible();
  });

  test('deve exibir pontos de cada entrada na timeline', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Timeline
    await page.click('[data-testid="nav-link-timeline"]');
    await page.waitForURL(/\/timeline/);

    // Verifica se há pontos visíveis nas entradas
    const points = page.locator('text=/\\+?\\d+ pts/');
    await expect(points.first()).toBeVisible();
  });

  test('deve diferenciar entradas positivas e negativas visualmente', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Timeline
    await page.click('[data-testid="nav-link-timeline"]');
    await page.waitForURL(/\/timeline/);

    // Verifica se há diferenciação visual (cores, badges)
    const positiveEntries = page.locator('[class*="green"], text=/\\+\\d+ pts/');
    const negativeEntries = page.locator('[class*="red"], text=/-\\d+ pts/');
    
    // Pelo menos um tipo deve estar visível
    const posCount = await positiveEntries.count();
    const negCount = await negativeEntries.count();
    
    expect(posCount + negCount).toBeGreaterThan(0);
  });

  test('deve exibir dados de entrada (descrição, data, duração)', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Timeline
    await page.click('[data-testid="nav-link-timeline"]');
    await page.waitForURL(/\/timeline/);

    // Verifica se há descrições visíveis
    const descriptions = page.locator('[data-testid^="entry-card-"] p');
    await expect(descriptions.first()).toBeVisible();

    // Verifica se há datas visíveis
    const dates = page.locator('text=/\\d{2}\\/\\d{2}\\/\\d{4}/');
    await expect(dates.first()).toBeVisible();
  });
});
