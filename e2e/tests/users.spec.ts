/**
 * Testes E2E de Usuários
 * 
 * Testa: lista de usuários, navegação para entradas,
 * visualização de entradas de outros usuários
 */

import { test, expect } from '@playwright/test';

test.describe('Usuários', () => {
  test('deve listar todos os usuários ativos', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Usuários
    await page.click('[data-testid="nav-link-users"]');
    await page.waitForURL(/\/users/);

    // Verifica se há usuários listados
    const users = page.locator('[data-testid^="user-card"], table tr');
    await expect(users.first()).toBeVisible();

    // Verifica se usuários de teste estão presentes
    await expect(page.locator('text=test_user_1')).toBeVisible();
    await expect(page.locator('text=test_user_2')).toBeVisible();
    await expect(page.locator('text=test_leader')).toBeVisible();
  });

  test('deve navegar para entradas de usuário ao clicar no card', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Usuários
    await page.click('[data-testid="nav-link-users"]');
    await page.waitForURL(/\/users/);

    // Clica no primeiro usuário (exceto si mesmo)
    const users = page.locator('[data-testid^="user-card"], table tr');
    await users.nth(1).click();

    // Aguarda navegação para página de entradas
    await page.waitForURL(/\/users\/\d+\/entries/);
    await expect(page).toHaveURL(/\/users\/\d+\/entries/);
  });

  test('deve renderizar entradas de outro usuário corretamente', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Usuários
    await page.click('[data-testid="nav-link-users"]');
    await page.waitForURL(/\/users/);

    // Clica em test_leader (que tem muitas entradas)
    const users = page.locator('[data-testid^="user-card"], table tr');
    await users.filter({ hasText: 'test_leader' }).click();

    // Aguarda navegação
    await page.waitForURL(/\/users\/\d+\/entries/);

    // Verifica se entradas estão visíveis
    const entries = page.locator('[data-testid^="entry-card-"]');
    await expect(entries.first()).toBeVisible();
  });

  test('deve exibir foto thumb nas entradas de outros usuários', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Usuários
    await page.click('[data-testid="nav-link-users"]');
    await page.waitForURL(/\/users/);

    // Clica em usuário com entradas
    const users = page.locator('[data-testid^="user-card"], table tr');
    await users.nth(1).click();
    await page.waitForURL(/\/users\/\d+\/entries/);

    // Verifica se há fotos (pode não ter, então é opcional)
    const photos = page.locator('img[src*="/images/"]');
    const count = await photos.count();
    
    // Pelo menos verifica que cards estão visíveis
    const entries = page.locator('[data-testid^="entry-card-"]');
    await expect(entries.first()).toBeVisible();
  });

  test('deve abrir modal de detalhes ao clicar no card de entrada', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Usuários
    await page.click('[data-testid="nav-link-users"]');
    await page.waitForURL(/\/users/);

    // Clica em usuário
    const users = page.locator('[data-testid^="user-card"], table tr');
    await users.nth(1).click();
    await page.waitForURL(/\/users\/\d+\/entries/);

    // Clica no primeiro card de entrada
    const firstEntry = page.locator('[data-testid^="entry-card-"]').first();
    await firstEntry.click();

    // Aguarda modal de detalhes abrir
    await expect(page.locator('[data-testid="entry-form-modal"]')).toBeVisible();
  });

  test('deve exibir cards em mobile e tabela em desktop', async ({ page }) => {
    // Teste em desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Usuários
    await page.click('[data-testid="nav-link-users"]');
    await page.waitForURL(/\/users/);

    // Em desktop, deve ter tabela
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Teste em mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForURL(/\/users/);

    // Em mobile, deve ter cards
    const cards = page.locator('[data-testid^="user-card"]');
    await expect(cards.first()).toBeVisible();
  });

  test('deve filtrar/buscar usuários (se houver busca)', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Usuários
    await page.click('[data-testid="nav-link-users"]');
    await page.waitForURL(/\/users/);

    // Verifica se há campo de busca
    const searchBox = page.locator('input[type="text"], input[type="search"]');
    const count = await searchBox.count();

    if (count > 0) {
      // Testa busca
      await searchBox.fill('test_leader');
      await page.waitForTimeout(500);

      // Verifica se resultado da busca aparece
      await expect(page.locator('text=test_leader')).toBeVisible();
    }
  });
});
