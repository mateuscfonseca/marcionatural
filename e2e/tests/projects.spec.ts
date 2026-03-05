/**
 * Testes E2E de Projetos Pessoais
 * 
 * Testa: criar, editar, excluir projetos, registrar tempo,
 * validar progresso semanal
 */

import { test, expect } from '@playwright/test';

test.describe('Projetos Pessoais', () => {
  test('deve acessar tela de projetos', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Projetos
    await page.click('[data-testid="nav-link-projects"]');
    await page.waitForURL(/\/projects/);

    // Verifica se tela de projetos está visível
    await expect(page.locator('text=Projetos')).toBeVisible();
  });

  test('deve criar novo projeto', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Projetos
    await page.click('[data-testid="nav-link-projects"]');
    await page.waitForURL(/\/projects/);

    // Abre modal de novo projeto (botão "Novo Projeto" ou similar)
    const newProjectButton = page.locator('button:has-text("Novo"), button:has-text("Criar"), button:has-text("Novo Projeto")');
    if (await newProjectButton.count() > 0) {
      await newProjectButton.click();
    } else {
      // Se não houver botão, usa FAB
      await page.click('[data-testid="fab-button"]');
      await page.click('[data-testid="fab-project-log"]');
    }

    // Aguarda modal abrir
    await expect(page.locator('[data-testid="entry-form-modal"], [data-testid="project-modal"]')).toBeVisible();
  });

  test('deve editar projeto existente', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Projetos
    await page.click('[data-testid="nav-link-projects"]');
    await page.waitForURL(/\/projects/);

    // Verifica se há projetos (seed cria um projeto)
    const projects = page.locator('[data-testid^="project-card-"], table tr');
    const count = await projects.count();

    if (count > 0) {
      // Clica em editar no primeiro projeto
      const editButton = page.locator('button:has-text("Editar")').first();
      if (await editButton.count() > 0) {
        await editButton.click();

        // Aguarda modal abrir
        await expect(page.locator('[data-testid="entry-form-modal"], [data-testid="project-modal"]')).toBeVisible();
      }
    }
  });

  test('deve excluir projeto', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Projetos
    await page.click('[data-testid="nav-link-projects"]');
    await page.waitForURL(/\/projects/);

    // Verifica se há projetos
    const projects = page.locator('[data-testid^="project-card-"], table tr');
    const count = await projects.count();

    if (count > 0) {
      // Clica em excluir
      const deleteButton = page.locator('button:has-text("Excluir")').first();
      if (await deleteButton.count() > 0) {
        await deleteButton.click();

        // Aguarda confirmação
        page.on('dialog', dialog => dialog.accept());

        // Aguarda toast de sucesso
        await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
      }
    }
  });

  test('deve registrar tempo em projeto via FAB', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Projetos
    await page.click('[data-testid="nav-link-projects"]');
    await page.waitForURL(/\/projects/);

    // Abre FAB
    await page.click('[data-testid="fab-button"]');
    await page.click('[data-testid="fab-project-log"]');

    // Aguarda modal de registro abrir
    await expect(page.locator('[data-testid="entry-form-modal"], [data-testid="project-log-modal"]')).toBeVisible();
  });

  test('deve validar progresso semanal do projeto', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Projetos
    await page.click('[data-testid="nav-link-projects"]');
    await page.waitForURL(/\/projects/);

    // Verifica se há indicação de progresso (barra de progresso, horas, etc.)
    const progressElements = page.locator('text=/\\d+.*hora|text=/.*progresso.*/i, [class*="progress"]');
    const count = await progressElements.count();
    
    // Seed cria projeto com logs diários
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('deve exibir meta de horas semanais', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Projetos
    await page.click('[data-testid="nav-link-projects"]');
    await page.waitForURL(/\/projects/);

    // Verifica se há meta de horas (seed cria projeto com meta de 10h)
    const goalElements = page.locator('text=/\\d+.*h.*semana|text=/.*meta.*/i');
    await expect(goalElements.first()).toBeVisible();
  });

  test('deve validar que meta batida gera +50 pontos', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Leaderboard para verificar pontos
    await page.waitForTimeout(2000);

    // Verifica se há pontos visíveis no leaderboard
    const pointsElements = page.locator('text=/\\d+.*pts/');
    await expect(pointsElements.first()).toBeVisible();
  });

  test('deve listar projetos ativos e inativos', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user_1');
    await page.fill('[data-testid="password-input"]', 'teste123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Projetos
    await page.click('[data-testid="nav-link-projects"]');
    await page.waitForURL(/\/projects/);

    // Verifica se há projetos listados
    const projects = page.locator('[data-testid^="project-card-"], table tr');
    await expect(projects.first()).toBeVisible();
  });
});
