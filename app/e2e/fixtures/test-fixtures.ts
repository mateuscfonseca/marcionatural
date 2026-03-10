/**
 * Fixtures e utilitários para testes E2E
 *
 * Fornece autenticação automática e funções utilitárias
 * para reutilização em todos os testes
 */

import { test as base, expect, Page, Locator } from '@playwright/test';

/**
 * Sanitiza nomes para uso em seletores data-testid
 * Remove acentos e caracteres especiais, substitui espaços por hífens
 */
function sanitizeId(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-')      // Substitui caracteres não alfanuméricos por hífen
    .replace(/^-+|-+$/g, '');         // Remove hífens das extremidades
}

// Dados de usuários de teste
export const TEST_USERS = {
  user1: { username: 'test_user_1', password: 'teste123' },
  user2: { username: 'test_user_2', password: 'teste123' },
  user3: { username: 'test_user_3', password: 'teste123' },
  leader: { username: 'test_leader', password: 'teste123' },
  reporter: { username: 'test_reporter', password: 'teste123' },
} as const;

// Tipos
export type TestUser = typeof TEST_USERS[keyof typeof TEST_USERS];

// Fixture base estendida
export const test = base.extend<{
  authenticatedPage: Page;
  testUser: TestUser;
  loginPage: Page;
}>({
  // Página de login
  loginPage: async ({ page }, use) => {
    await page.goto('/login');
    await use(page);
  },

  // Usuário de teste padrão
  testUser: [TEST_USERS.user1, { option: true }],

  // Página autenticada
  authenticatedPage: async ({ page, testUser }, use) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', testUser.username);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.click('[data-testid="login-button"]');
    
    // Aguarda redirect para leaderboard
    await page.waitForURL(/\/leaderboard/);
    
    await use(page);
  },
});

export { expect };

/**
 * Realiza login na aplicação
 */
export async function login(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.fill('[data-testid="username-input"]', username);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL(/\/leaderboard/);
}

/**
 * Realiza logout da aplicação
 */
export async function logout(page: Page) {
  // Abre sidebar se estiver fechada (mobile)
  const sidebarOpen = await page.isVisible('[data-testid="sidebar"]');
  if (!sidebarOpen) {
    await page.click('[data-testid="menu-button"]');
  }
  
  // Clica no botão de logout
  await page.click('[data-testid="logout-button"]');
  await page.waitForURL('/login');
}

/**
 * Cria uma nova entrada via FAB
 */
export async function createEntry(
  page: Page,
  options: {
    type: 'Alimentação Limpa' | 'Alimentação Suja' | 'Exercício Físico' | 'Usar Tabaco';
    description: string;
    date?: string;
    duration?: number;
  }
) {
  // Abre FAB
  await page.click('[data-testid="fab-button"]');

  // Seleciona "Nova Entrada"
  await page.click('[data-testid="fab-new-entry"]');

  // Aguarda modal abrir
  await page.waitForSelector('[data-testid="entry-form-modal"]', { state: 'visible' });

  // Seleciona tipo de atividade
  await page.waitForSelector('[data-testid="activity-type-select"]', { state: 'visible' });
  await page.click('[data-testid="activity-type-select"]');
  await page.waitForSelector(`[data-testid="activity-type-option-${sanitizeId(options.type)}"]`, { state: 'visible' });
  await page.click(`[data-testid="activity-type-option-${sanitizeId(options.type)}"]`);
  
  // Preenche descrição
  await page.fill('[data-testid="description-input"]', options.description);
  
  // Preenche data (se fornecida)
  if (options.date) {
    await page.fill('[data-testid="date-input"]', options.date);
  }
  
  // Preenche duração (se fornecida)
  if (options.duration) {
    await page.fill('[data-testid="duration-input"]', options.duration.toString());
  }
  
  // Submete
  await page.click('[data-testid="submit-entry-button"]');
  
  // Aguarda modal fechar e toast aparecer
  await page.waitForSelector('[data-testid="toast-success"]');
}

/**
 * Espera toast de sucesso
 */
export async function expectSuccessToast(page: Page) {
  await page.waitForSelector('[data-testid="toast-success"]');
}

/**
 * Espera toast de erro
 */
export async function expectErrorToast(page: Page) {
  await page.waitForSelector('[data-testid="toast-error"]');
}

/**
 * Verifica se está em página protegida (redireciona para login se não autenticado)
 */
export async function expectProtectedPage(page: Page) {
  await page.waitForURL('/login');
}

/**
 * Navega para uma tela específica pelo menu
 */
export async function navigateByMenu(page: Page, path: string) {
  // Verifica se sidebar está visível, se não, abre
  const isMobile = await page.evaluate(() => window.innerWidth < 768);
  if (isMobile) {
    await page.click('[data-testid="menu-button"]');
  }
  
  await page.click(`[data-testid="nav-link-${path}"]`);
  
  // Fecha sidebar em mobile
  if (isMobile) {
    await page.click('[data-testid="sidebar-overlay"]');
  }
}
