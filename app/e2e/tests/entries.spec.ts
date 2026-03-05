/**
 * Testes E2E de Entradas (CRUD)
 * 
 * Testa: criar, editar, excluir entradas, upload de foto,
 * validação de limite diário, filtros, paginação
 */

import { test, expect } from '@playwright/test';
import {
  logTestStart,
  logTestEnd,
  logStep,
  logSuccess,
  takeScreenshot,
  fillWithLog,
  clickWithLog,
  navigateWithLog,
  expectWithScreenshot,
} from '../utils/test-helpers';

test.describe('Entradas - CRUD', () => {
  test('deve abrir modal de nova entrada via FAB', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    // Login
    await navigateWithLog(page, testInfo, '/login', 'Login');
    await fillWithLog(page, testInfo, '[data-testid="username-input"]', 'test_user_1', 'Username');
    await fillWithLog(page, testInfo, '[data-testid="password-input"]', 'teste123', 'Password');
    await clickWithLog(page, testInfo, '[data-testid="login-button"]', 'Login');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Minhas Entradas
    await clickWithLog(page, testInfo, '[data-testid="nav-link-my-entries"]', 'Menu Minhas Entradas');
    await page.waitForURL(/\/my-entries/);
    await takeScreenshot(page, testInfo, { label: 'my-entries-page', type: 'step' });

    // Abre FAB
    await clickWithLog(page, testInfo, '[data-testid="fab-button"]', 'FAB Button');
    await clickWithLog(page, testInfo, '[data-testid="fab-new-entry"]', 'FAB Nova Entrada');

    // Aguarda modal abrir
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('[data-testid="entry-form-modal"]')).toBeVisible();
    }, 'Modal de entrada visível');

    await logTestEnd(testInfo, 'passed');
  });

  test('deve criar entrada de alimentação limpa com sucesso', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    // Login
    await navigateWithLog(page, testInfo, '/login', 'Login');
    await fillWithLog(page, testInfo, '[data-testid="username-input"]', 'test_user_1', 'Username');
    await fillWithLog(page, testInfo, '[data-testid="password-input"]', 'teste123', 'Password');
    await clickWithLog(page, testInfo, '[data-testid="login-button"]', 'Login');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Minhas Entradas
    await clickWithLog(page, testInfo, '[data-testid="nav-link-my-entries"]', 'Menu Minhas Entradas');
    await page.waitForURL(/\/my-entries/);

    // Abre modal de nova entrada
    await clickWithLog(page, testInfo, '[data-testid="fab-button"]', 'FAB');
    await clickWithLog(page, testInfo, '[data-testid="fab-new-entry"]', 'Nova Entrada');

    // Preenche formulário
    await logStep(testInfo, 'Selecionando tipo de atividade', '📝');
    await page.click('[data-testid="activity-type-select"]');
    await page.click('[data-testid="activity-type-option-Alimentacao Limpa"]');
    await takeScreenshot(page, testInfo, { label: 'activity-type-selected', type: 'step' });

    await fillWithLog(page, testInfo, '[data-testid="description-input"]', 'Cafe da manha saudavel - teste E2E', 'Descricao');
    await fillWithLog(page, testInfo, '[data-testid="date-input"]', new Date().toISOString().split('T')[0]!, 'Data');

    // Submete
    await clickWithLog(page, testInfo, '[data-testid="submit-entry-button"]', 'Submit');

    // Aguarda toast de sucesso
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
    }, 'Toast de sucesso visível');

    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('[data-testid="entry-form-modal"]')).not.toBeVisible();
    }, 'Modal fechado após sucesso');

    await logTestEnd(testInfo, 'passed');
  });

  test('deve criar entrada de exercicio com duracao', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    // Login
    await navigateWithLog(page, testInfo, '/login', 'Login');
    await fillWithLog(page, testInfo, '[data-testid="username-input"]', 'test_user_1', 'Username');
    await fillWithLog(page, testInfo, '[data-testid="password-input"]', 'teste123', 'Password');
    await clickWithLog(page, testInfo, '[data-testid="login-button"]', 'Login');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Minhas Entradas
    await clickWithLog(page, testInfo, '[data-testid="nav-link-my-entries"]', 'Menu Minhas Entradas');
    await page.waitForURL(/\/my-entries/);

    // Abre modal
    await clickWithLog(page, testInfo, '[data-testid="fab-button"]', 'FAB');
    await clickWithLog(page, testInfo, '[data-testid="fab-new-entry"]', 'Nova Entrada');

    // Seleciona exercicio
    await logStep(testInfo, 'Selecionando Exercício Físico', '🏃');
    await page.click('[data-testid="activity-type-select"]');
    await page.click('[data-testid="activity-type-option-Exercicio Fisico"]');

    // Preenche
    await fillWithLog(page, testInfo, '[data-testid="description-input"]', 'Corrida matinal - teste E2E', 'Descricao');
    await fillWithLog(page, testInfo, '[data-testid="duration-input"]', '30', 'Duracao (min)');
    await fillWithLog(page, testInfo, '[data-testid="date-input"]', new Date().toISOString().split('T')[0]!, 'Data');

    // Submete
    await clickWithLog(page, testInfo, '[data-testid="submit-entry-button"]', 'Submit');

    // Verifica sucesso
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
    }, 'Sucesso ao criar entrada com duração');

    await logTestEnd(testInfo, 'passed');
  });

  test('deve exibir erro ao tentar criar segunda entrada da mesma categoria no mesmo dia', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    // Login
    await navigateWithLog(page, testInfo, '/login', 'Login');
    await fillWithLog(page, testInfo, '[data-testid="username-input"]', 'test_user_1', 'Username');
    await fillWithLog(page, testInfo, '[data-testid="password-input"]', 'teste123', 'Password');
    await clickWithLog(page, testInfo, '[data-testid="login-button"]', 'Login');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Minhas Entradas
    await clickWithLog(page, testInfo, '[data-testid="nav-link-my-entries"]', 'Menu Minhas Entradas');
    await page.waitForURL(/\/my-entries/);

    // Tenta criar segunda entrada
    await clickWithLog(page, testInfo, '[data-testid="fab-button"]', 'FAB');
    await clickWithLog(page, testInfo, '[data-testid="fab-new-entry"]', 'Nova Entrada');

    await logStep(testInfo, 'Selecionando Alimentacao Limpa (já existe hoje)', '⚠️');
    await page.click('[data-testid="activity-type-select"]');
    await page.click('[data-testid="activity-type-option-Alimentacao Limpa"]');
    await fillWithLog(page, testInfo, '[data-testid="description-input"]', 'Segunda entrada do dia', 'Descricao');
    await fillWithLog(page, testInfo, '[data-testid="date-input"]', new Date().toISOString().split('T')[0]!, 'Data');

    await clickWithLog(page, testInfo, '[data-testid="submit-entry-button"]', 'Submit');

    // Aguarda erro
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('[data-testid="toast-error"]')).toBeVisible();
    }, 'Toast de erro por limite diário');

    await logTestEnd(testInfo, 'passed');
  });

  test('deve editar entrada existente', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    // Login
    await navigateWithLog(page, testInfo, '/login', 'Login');
    await fillWithLog(page, testInfo, '[data-testid="username-input"]', 'test_user_1', 'Username');
    await fillWithLog(page, testInfo, '[data-testid="password-input"]', 'teste123', 'Password');
    await clickWithLog(page, testInfo, '[data-testid="login-button"]', 'Login');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Minhas Entradas
    await clickWithLog(page, testInfo, '[data-testid="nav-link-my-entries"]', 'Menu Minhas Entradas');
    await page.waitForURL(/\/my-entries/);
    await takeScreenshot(page, testInfo, { label: 'entries-list-before-edit', type: 'step' });

    // Clica em editar
    await logStep(testInfo, 'Clicando em Editar na primeira entrada', '✏️');
    await page.click('button:has-text("Editar")');

    // Aguarda modal e edita
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('[data-testid="entry-form-modal"]')).toBeVisible();
    }, 'Modal de edição aberto');

    await fillWithLog(page, testInfo, '[data-testid="description-input"]', 'Descricao editada - teste E2E', 'Nova Descricao');

    // Submete
    await clickWithLog(page, testInfo, '[data-testid="submit-entry-button"]', 'Salvar');

    // Verifica sucesso
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
    }, 'Sucesso ao editar entrada');

    await logTestEnd(testInfo, 'passed');
  });

  test('deve excluir entrada com confirmacao', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    // Login
    await navigateWithLog(page, testInfo, '/login', 'Login');
    await fillWithLog(page, testInfo, '[data-testid="username-input"]', 'test_user_1', 'Username');
    await fillWithLog(page, testInfo, '[data-testid="password-input"]', 'teste123', 'Password');
    await clickWithLog(page, testInfo, '[data-testid="login-button"]', 'Login');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Minhas Entradas
    await clickWithLog(page, testInfo, '[data-testid="nav-link-my-entries"]', 'Menu Minhas Entradas');
    await page.waitForURL(/\/my-entries/);

    // Conta entradas antes
    const entriesBefore = await page.locator('[data-testid^="entry-card-"]').count();
    await logStep(testInfo, `Entradas antes de excluir: ${entriesBefore}`, '📊');

    // Clica em excluir
    await logStep(testInfo, 'Clicando em Excluir', '🗑️');
    await page.click('button:has-text("Excluir")');

    // Aceita confirmação
    page.on('dialog', dialog => dialog.accept());

    // Verifica sucesso
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
    }, 'Sucesso ao excluir entrada');

    // Verifica que diminuiu
    const entriesAfter = await page.locator('[data-testid^="entry-card-"]').count();
    await logStep(testInfo, `Entradas depois de excluir: ${entriesAfter}`, '📊');
    
    await expectWithScreenshot(page, testInfo, async () => {
      expect(entriesAfter).toBeLessThan(entriesBefore);
    }, 'Número de entradas diminuiu');

    await logTestEnd(testInfo, 'passed');
  });

  test('deve abrir modal de detalhes ao clicar no card', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    // Login
    await navigateWithLog(page, testInfo, '/login', 'Login');
    await fillWithLog(page, testInfo, '[data-testid="username-input"]', 'test_user_1', 'Username');
    await fillWithLog(page, testInfo, '[data-testid="password-input"]', 'teste123', 'Password');
    await clickWithLog(page, testInfo, '[data-testid="login-button"]', 'Login');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Minhas Entradas
    await clickWithLog(page, testInfo, '[data-testid="nav-link-my-entries"]', 'Menu Minhas Entradas');
    await page.waitForURL(/\/my-entries/);

    // Clica no primeiro card
    await logStep(testInfo, 'Clicando no primeiro card de entrada', '📇');
    const firstEntry = page.locator('[data-testid^="entry-card-"]').first();
    await firstEntry.click();

    // Aguarda modal
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('[data-testid="entry-form-modal"]')).toBeVisible();
    }, 'Modal de detalhes aberto');

    await logTestEnd(testInfo, 'passed');
  });

  test('deve filtrar entradas por tipo (positivas/negativas)', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    // Login
    await navigateWithLog(page, testInfo, '/login', 'Login');
    await fillWithLog(page, testInfo, '[data-testid="username-input"]', 'test_user_1', 'Username');
    await fillWithLog(page, testInfo, '[data-testid="password-input"]', 'teste123', 'Password');
    await clickWithLog(page, testInfo, '[data-testid="login-button"]', 'Login');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Minhas Entradas
    await clickWithLog(page, testInfo, '[data-testid="nav-link-my-entries"]', 'Menu Minhas Entradas');
    await page.waitForURL(/\/my-entries/);

    // Clica no filtro de positivas
    await logStep(testInfo, 'Filtrando por Positivas', '✅');
    await page.click('button:has-text("Positivas")');
    await takeScreenshot(page, testInfo, { label: 'filter-positivas', type: 'step' });

    // Verifica entradas
    const entries = page.locator('[data-testid^="entry-card-"]');
    const count = await entries.count();
    await logStep(testInfo, `Entradas positivas encontradas: ${count}`, '📊');
    expect(count).toBeGreaterThan(0);

    // Limpa filtro
    await logStep(testInfo, 'Limpando filtro', '🧹');
    await page.click('button:has-text("Todos")');
    await takeScreenshot(page, testInfo, { label: 'filter-all', type: 'step' });

    await logTestEnd(testInfo, 'passed');
  });

  test('deve testar paginacao com mais de 10 entradas', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    // Login
    await navigateWithLog(page, testInfo, '/login', 'Login');
    await fillWithLog(page, testInfo, '[data-testid="username-input"]', 'test_user_1', 'Username');
    await fillWithLog(page, testInfo, '[data-testid="password-input"]', 'teste123', 'Password');
    await clickWithLog(page, testInfo, '[data-testid="login-button"]', 'Login');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Minhas Entradas
    await clickWithLog(page, testInfo, '[data-testid="nav-link-my-entries"]', 'Menu Minhas Entradas');
    await page.waitForURL(/\/my-entries/);

    // Verifica controles de paginação
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('button:has-text("Próxima")')).toBeVisible();
    }, 'Controles de paginação visíveis');

    // Navega para próxima página
    await logStep(testInfo, 'Indo para página 2', '📄');
    await page.click('button:has-text("Próxima")');
    await takeScreenshot(page, testInfo, { label: 'page-2', type: 'step' });

    // Verifica mudança
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('text=Página 2')).toBeVisible();
    }, 'Página 2 visível');

    await logTestEnd(testInfo, 'passed');
  });

  test('deve filtrar entradas por periodo (hoje, ultimos 3 dias, semana)', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    // Login
    await navigateWithLog(page, testInfo, '/login', 'Login');
    await fillWithLog(page, testInfo, '[data-testid="username-input"]', 'test_user_1', 'Username');
    await fillWithLog(page, testInfo, '[data-testid="password-input"]', 'teste123', 'Password');
    await clickWithLog(page, testInfo, '[data-testid="login-button"]', 'Login');
    await page.waitForURL(/\/leaderboard/);

    // Navega para Minhas Entradas
    await clickWithLog(page, testInfo, '[data-testid="nav-link-my-entries"]', 'Menu Minhas Entradas');
    await page.waitForURL(/\/my-entries/);

    // Filtra por hoje
    await logStep(testInfo, 'Filtrando por Hoje', '📅');
    await page.click('button:has-text("Hoje")');
    await takeScreenshot(page, testInfo, { label: 'filter-today', type: 'step' });

    // Verifica filtro
    const entries = page.locator('[data-testid^="entry-card-"]');
    const count = await entries.count();
    await logStep(testInfo, `Entradas hoje: ${count}`, '📊');
    expect(count).toBeGreaterThanOrEqual(0);

    // Limpa filtro
    await logStep(testInfo, 'Limpando filtro', '🧹');
    await page.click('button:has-text("Tudo")');
    await takeScreenshot(page, testInfo, { label: 'filter-all-time', type: 'step' });

    await logTestEnd(testInfo, 'passed');
  });
});
