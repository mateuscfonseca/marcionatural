/**
 * Testes E2E de Autenticação
 * 
 * Testa: registro, login, logout, mensagens de erro,
 * redirecionamento de rotas protegidas
 * 
 * @see https://playwright.dev/docs/intro
 */

import { test, expect } from '@playwright/test';
import {
  logTestStart,
  logTestEnd,
  logStep,
  logSuccess,
  logError,
  takeScreenshot,
  fillWithLog,
  clickWithLog,
  navigateWithLog,
  expectWithScreenshot,
} from '../utils/test-helpers';

test.describe('Autenticação', () => {
  test('deve realizar login com credenciais válidas', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    // Navega para login
    await navigateWithLog(page, testInfo, '/login', 'Página de Login');

    // Preenche credenciais
    await fillWithLog(page, testInfo, '[data-testid="username-input"]', 'test_user_1', 'Username');
    await fillWithLog(page, testInfo, '[data-testid="password-input"]', 'teste123', 'Password');

    // Submete formulário
    await clickWithLog(page, testInfo, '[data-testid="login-button"]', 'Botão Login');

    // Aguarda redirect
    await logStep(testInfo, 'Aguardando redirecionamento para leaderboard', '🔄');
    await page.waitForURL(/\/leaderboard/);

    // Verifica sucesso
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page).toHaveURL(/\/leaderboard/);
    }, 'URL contém leaderboard');

    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('[data-testid="logout-button"]')).toBeVisible();
    }, 'Botão de logout visível');

    await logSuccess('Login realizado com sucesso!');
    await logTestEnd(testInfo, 'passed');
  });

  test('deve exibir erro com credenciais inválidas', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    // Navega para login
    await navigateWithLog(page, testInfo, '/login', 'Página de Login');

    // Preenche credenciais inválidas
    await fillWithLog(page, testInfo, '[data-testid="username-input"]', 'usuario_invalido', 'Username Inválido');
    await fillWithLog(page, testInfo, '[data-testid="password-input"]', 'senha_errada', 'Senha Inválida');

    // Submete formulário
    await clickWithLog(page, testInfo, '[data-testid="login-button"]', 'Botão Login');

    // Aguarda mensagem de erro
    await logStep(testInfo, 'Aguardando mensagem de erro', '⏳');
    
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
    }, 'Mensagem de erro visível');

    await logSuccess('Erro exibido corretamente!');
    await logTestEnd(testInfo, 'passed');
  });

  test('deve realizar logout com sucesso', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    // Login prévio
    await logStep(testInfo, 'Realizando login prévio', '🔐');
    await navigateWithLog(page, testInfo, '/login', 'Página de Login');
    await fillWithLog(page, testInfo, '[data-testid="username-input"]', 'test_user_1', 'Username');
    await fillWithLog(page, testInfo, '[data-testid="password-input"]', 'teste123', 'Password');
    await clickWithLog(page, testInfo, '[data-testid="login-button"]', 'Botão Login');
    await page.waitForURL(/\/leaderboard/);

    // Logout
    await logStep(testInfo, 'Realizando logout', '🚪');
    await clickWithLog(page, testInfo, '[data-testid="logout-button"]', 'Botão Logout');

    // Aguarda redirect para login
    await logStep(testInfo, 'Aguardando redirecionamento para login', '🔄');
    await page.waitForURL('/login');

    // Verifica sucesso
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page).toHaveURL('/login');
    }, 'URL é /login após logout');

    await logSuccess('Logout realizado com sucesso!');
    await logTestEnd(testInfo, 'passed');
  });

  test('deve redirecionar para login ao tentar acessar rota protegida sem auth', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    // Tenta acessar leaderboard sem estar logado
    await logStep(testInfo, 'Tentando acessar rota protegida (/leaderboard) sem autenticação', '🚫');
    await page.goto('/leaderboard');

    // Aguarda redirecionamento
    await logStep(testInfo, 'Aguardando redirecionamento para login', '🔄');
    await page.waitForURL('/login');

    // Verifica sucesso
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page).toHaveURL('/login');
    }, 'Redirecionado para /login');

    await logSuccess('Rota protegida bloqueada corretamente!');
    await logTestEnd(testInfo, 'passed');
  });

  test('deve redirecionar para leaderboard ao tentar acessar login estando logado', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    // Login prévio
    await logStep(testInfo, 'Realizando login prévio', '🔐');
    await navigateWithLog(page, testInfo, '/login', 'Página de Login');
    await fillWithLog(page, testInfo, '[data-testid="username-input"]', 'test_user_1', 'Username');
    await fillWithLog(page, testInfo, '[data-testid="password-input"]', 'teste123', 'Password');
    await clickWithLog(page, testInfo, '[data-testid="login-button"]', 'Botão Login');
    await page.waitForURL(/\/leaderboard/);

    // Tenta acessar login novamente
    await logStep(testInfo, 'Tentando acessar /login estando autenticado', '🔄');
    await page.goto('/login');

    // Aguarda redirecionamento
    await logStep(testInfo, 'Aguardando redirecionamento para leaderboard', '🔄');
    await page.waitForURL(/\/leaderboard/);

    // Verifica sucesso
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page).toHaveURL(/\/leaderboard/);
    }, 'Redirecionado para /leaderboard');

    await logSuccess('Redirecionamento de login funcionou corretamente!');
    await logTestEnd(testInfo, 'passed');
  });

  test('deve realizar cadastro de novo usuário', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    // Gera username único
    const username = `test_e2e_${Date.now().toString().slice(-6)}`;
    const password = 'teste123';

    // Navega para registro
    await navigateWithLog(page, testInfo, '/register', 'Página de Registro');

    // Preenche formulário
    await fillWithLog(page, testInfo, '[data-testid="username-input"]', username, 'Username');
    await fillWithLog(page, testInfo, '[data-testid="password-input"]', password, 'Password');
    await fillWithLog(page, testInfo, '[data-testid="confirm-password-input"]', password, 'Confirmar Password');

    // Submete formulário
    await clickWithLog(page, testInfo, '[data-testid="register-button"]', 'Botão Cadastrar');

    // Aguarda redirect
    await logStep(testInfo, 'Aguardando redirecionamento para leaderboard', '🔄');
    await page.waitForURL(/\/leaderboard/);

    // Verifica sucesso
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page).toHaveURL(/\/leaderboard/);
    }, 'Cadastro realizado com sucesso');

    await logSuccess(`Usuário ${username} criado com sucesso!`);
    await logTestEnd(testInfo, 'passed');
  });

  test('deve exibir erro ao cadastrar senha com menos de 6 caracteres', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    // Navega para registro
    await navigateWithLog(page, testInfo, '/register', 'Página de Registro');

    // Preenche com senha curta
    await fillWithLog(page, testInfo, '[data-testid="username-input"]', 'usuario_teste', 'Username');
    await fillWithLog(page, testInfo, '[data-testid="password-input"]', '12345', 'Password Curta');
    await fillWithLog(page, testInfo, '[data-testid="confirm-password-input"]', '12345', 'Confirmar Password');

    // Submete formulário
    await clickWithLog(page, testInfo, '[data-testid="register-button"]', 'Botão Cadastrar');

    // Aguarda mensagem de erro
    await logStep(testInfo, 'Aguardando mensagem de erro de validação', '⏳');
    
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('[data-testid="register-error"]')).toBeVisible();
    }, 'Mensagem de erro de validação visível');

    await logSuccess('Validação de senha funcionou corretamente!');
    await logTestEnd(testInfo, 'passed');
  });

  test('deve exibir erro ao cadastrar senhas diferentes', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    // Navega para registro
    await navigateWithLog(page, testInfo, '/register', 'Página de Registro');

    // Preenche com senhas diferentes
    await fillWithLog(page, testInfo, '[data-testid="username-input"]', 'usuario_teste', 'Username');
    await fillWithLog(page, testInfo, '[data-testid="password-input"]', 'senha123', 'Password');
    await fillWithLog(page, testInfo, '[data-testid="confirm-password-input"]', 'senha456', 'Confirmar Password Diferente');

    // Submete formulário
    await clickWithLog(page, testInfo, '[data-testid="register-button"]', 'Botão Cadastrar');

    // Aguarda mensagem de erro
    await logStep(testInfo, 'Aguardando mensagem de erro', '⏳');
    
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page.locator('[data-testid="register-error"]')).toBeVisible();
    }, 'Mensagem de erro de senhas diferentes visível');

    await logSuccess('Validação de senhas diferentes funcionou corretamente!');
    await logTestEnd(testInfo, 'passed');
  });

  test('deve navegar para tela de registro a partir do login', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    // Navega para login
    await navigateWithLog(page, testInfo, '/login', 'Página de Login');

    // Clica em "Cadastre-se grátis"
    await logStep(testInfo, 'Clicando em link de cadastro', '🔗');
    await page.click('text=Cadastre-se grátis');

    // Aguarda navegação
    await logStep(testInfo, 'Aguardando navegação para /register', '🔄');
    await page.waitForURL('/register');

    // Verifica sucesso
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page).toHaveURL('/register');
    }, 'Navegou para /register');

    await logSuccess('Navegação para registro funcionou corretamente!');
    await logTestEnd(testInfo, 'passed');
  });

  test('deve navegar para tela de login a partir do registro', async ({ page }, testInfo) => {
    await logTestStart(testInfo);

    // Navega para registro
    await navigateWithLog(page, testInfo, '/register', 'Página de Registro');

    // Clica em "Faça login"
    await logStep(testInfo, 'Clicando em link de login', '🔗');
    await page.click('text=Faça login');

    // Aguarda navegação
    await logStep(testInfo, 'Aguardando navegação para /login', '🔄');
    await page.waitForURL('/login');

    // Verifica sucesso
    await expectWithScreenshot(page, testInfo, async () => {
      await expect(page).toHaveURL('/login');
    }, 'Navegou para /login');

    await logSuccess('Navegação para login funcionou corretamente!');
    await logTestEnd(testInfo, 'passed');
  });
});
