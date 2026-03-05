/**
 * Testes E2E de Navegação e Rotas Protegidas
 * 
 * Testa: sidebar, menu, rotas protegidas, botão flutuante,
 * toast messages
 */

import { test, expect } from '@playwright/test';

test.describe('Navegação', () => {
  test('deve abrir e fechar sidebar em mobile', async ({ page }) => {
    // Configura viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Sidebar deve estar fechada inicialmente em mobile
    const sidebar = page.locator('[data-testid="sidebar"]');
    
    // Abre sidebar
    await page.click('[data-testid="menu-button"]');
    await expect(sidebar).toBeVisible();

    // Fecha sidebar clicando no overlay
    await page.click('[data-testid="sidebar-overlay"]');
    await expect(sidebar).not.toBeVisible();
  });

  test('deve navegar para todas as telas pelo menu', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para cada tela
    const routes = [
      { name: 'Leaderboard', path: '/leaderboard', testId: 'nav-link-leaderboard' },
      { name: 'Timeline', path: '/timeline', testId: 'nav-link-timeline' },
      { name: 'Minhas Entradas', path: '/my-entries', testId: 'nav-link-my-entries' },
      { name: 'Votação', path: '/voting', testId: 'nav-link-voting' },
      { name: 'Projetos', path: '/projects', testId: 'nav-link-projects' },
      { name: 'Usuários', path: '/users', testId: 'nav-link-users' },
    ];

    for (const route of routes) {
      await page.click(`[data-testid="${route.testId}"]`);
      await page.waitForURL(route.path);
      await expect(page).toHaveURL(route.path);
    }
  });

  test('deve fechar sidebar ao navegar em mobile', async ({ page }) => {
    // Configura viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Abre sidebar
    await page.click('[data-testid="menu-button"]');
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).toBeVisible();

    // Navega para outra tela
    await page.click('[data-testid="nav-link-timeline"]');

    // Sidebar deve fechar automaticamente
    await expect(sidebar).not.toBeVisible();
  });

  test('deve exibir botão flutuante (FAB) em todas as telas', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Telas que devem ter FAB
    const screensWithFab = [
      '/leaderboard',
      '/timeline',
      '/my-entries',
      '/projects',
      '/users',
    ];

    for (const screen of screensWithFab) {
      await page.goto(screen);
      await page.waitForTimeout(500);
      
      const fabButton = page.locator('[data-testid="fab-button"]');
      await expect(fabButton).toBeVisible();
    }
  });

  test('deve abrir menu de opções do FAB', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Abre FAB
    await page.click('[data-testid="fab-button"]');

    // Verifica se opções estão visíveis
    await expect(page.locator('[data-testid="fab-new-entry"]')).toBeVisible();
    await expect(page.locator('[data-testid="fab-project-log"]')).toBeVisible();
  });

  test('deve exibir mensagens toast de sucesso', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Minhas Entradas
    await page.click('[data-testid="nav-link-my-entries"]');
    await page.waitForURL(/\/my-entries/);

    // Abre modal de nova entrada
    await page.click('[data-testid="fab-button"]');
    await page.click('[data-testid="fab-new-entry"]');

    // Preenche formulário mínimo
    await page.click('[data-testid="activity-type-select"]');
    await page.click('[data-testid="activity-type-option-Alimentação Limpa"]');
    await page.fill('[data-testid="description-input"]', 'Teste toast E2E');
    await page.fill('[data-testid="date-input"]', new Date().toISOString().split('T')[0]!);

    // Submete
    await page.click('[data-testid="submit-entry-button"]');

    // Aguarda toast de sucesso
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
  });

  test('deve exibir mensagens toast de erro', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Minhas Entradas
    await page.click('[data-testid="nav-link-my-entries"]');
    await page.waitForURL(/\/my-entries/);

    // Tenta criar entrada sem tipo de atividade (deve gerar erro)
    await page.click('[data-testid="fab-button"]');
    await page.click('[data-testid="fab-new-entry"]');

    // Preenche apenas descrição, sem tipo
    await page.fill('[data-testid="description-input"]', 'Teste sem tipo');
    await page.fill('[data-testid="date-input"]', new Date().toISOString().split('T')[0]!);

    // Submete (deve falhar)
    await page.click('[data-testid="submit-entry-button"]');

    // Aguarda toast de erro (ou mensagem de validação)
    await expect(page.locator('[data-testid="toast-error"]')).toBeVisible();
  });

  test('deve redirecionar para login ao tentar acessar rota protegida diretamente', async ({ page }) => {
    // Tenta acessar rotas protegidas sem estar logado
    const protectedRoutes = [
      '/leaderboard',
      '/timeline',
      '/my-entries',
      '/projects',
      '/users',
      '/voting',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForURL('/login');
      await expect(page).toHaveURL('/login');
    }
  });

  test('deve exibir header com nome do usuário logado', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Verifica se header está visível com nome do usuário
    await expect(page.locator('text=test_user_1')).toBeVisible();
    await expect(page.locator('[data-testid="logout-button"]')).toBeVisible();
  });

  test('deve exibir botão de logout no header', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Verifica se botão de logout está visível
    const logoutButton = page.locator('[data-testid="logout-button"]');
    await expect(logoutButton).toBeVisible();

    // Clica em logout
    await logoutButton.click();
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('deve manter sidebar sempre visível em desktop', async ({ page }) => {
    // Configura viewport desktop
    await page.setViewportSize({ width: 1280, height: 720 });

    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Sidebar deve estar sempre visível em desktop
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).toBeVisible();

    // Navega para outra tela
    await page.click('[data-testid="nav-link-timeline"]');
    await page.waitForURL(/\/timeline/);

    // Sidebar continua visível
    await expect(sidebar).toBeVisible();
  });
});
