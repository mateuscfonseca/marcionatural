/**
 * Utilities para testes E2E
 * 
 * Fornece funções para screenshots organizadas, logs detalhados
 * e helpers para debug de testes
 */

import { Page, TestInfo } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Cores para logs no console
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Formata timestamp para nomes de arquivos
 */
function formatTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').replace(/T/, '_').slice(0, -5);
}

/**
 * Formata hora para logs no console
 */
function formatTime(): string {
  return new Date().toLocaleTimeString('pt-BR');
}

/**
 * Garante que o diretório existe
 */
function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Tipos de screenshot
 */
export type ScreenshotType = 'step' | 'success' | 'error' | 'final' | 'debug';

/**
 * Opções para screenshot
 */
export interface ScreenshotOptions {
  /** Label descritiva para o screenshot */
  label: string;
  /** Tipo do screenshot (padrão: 'step') */
  type?: ScreenshotType;
  /** Página completa (padrão: true) */
  fullPage?: boolean;
  /** Não salvar, apenas retornar buffer (padrão: false) */
  skipSave?: boolean;
}

/**
 * Tira screenshot e salva em múltiplas localizações
 * 
 * @param page - Página do Playwright
 * @param testInfo - Informações do teste
 * @param options - Opções do screenshot
 */
export async function takeScreenshot(
  page: Page,
  testInfo: TestInfo,
  options: ScreenshotOptions
): Promise<string> {
  const { label, type = 'step', fullPage = true, skipSave = false } = options;
  
  const timestamp = formatTimestamp();
  const fileName = `${label}-${timestamp}.png`;
  
  // Caminhos
  const outputDir = testInfo.outputDir;
  const screenshotsDir = path.join(process.cwd(), 'e2e', 'screenshots');
  const typeDir = type === 'error' ? 'error' : 'success';
  
  // Garante diretórios
  ensureDir(outputDir);
  ensureDir(path.join(screenshotsDir, typeDir));
  
  // Tira o screenshot
  const screenshotBuffer = await page.screenshot({
    fullPage,
    type: 'png',
  });
  
  if (!skipSave) {
    // Salva no diretório do teste
    const testResultPath = path.join(outputDir, fileName);
    fs.writeFileSync(testResultPath, screenshotBuffer);
    
    // Salva no diretório organizado por tipo
    const organizedPath = path.join(screenshotsDir, typeDir, fileName);
    fs.writeFileSync(organizedPath, screenshotBuffer);
    
    // Log
    console.log(
      `${colors.cyan}📸 [${type.toUpperCase()}]${colors.reset} ${label}`
    );
    console.log(
      `${colors.dim}   📁 Test: ${testResultPath}${colors.reset}`
    );
    console.log(
      `${colors.dim}   📁 Organized: ${organizedPath}${colors.reset}`
    );
  } else {
    console.log(
      `${colors.cyan}📸 [${type.toUpperCase()}]${colors.reset} ${label} ${colors.dim}(não salvo)${colors.reset}`
    );
  }
  
  return fileName;
}

/**
 * Registra um passo do teste com log detalhado
 * 
 * @param testInfo - Informações do teste
 * @param message - Mensagem do passo
 * @param emoji - Emoji opcional para o passo
 */
export async function logStep(
  testInfo: TestInfo,
  message: string,
  emoji: string = '⏩'
): Promise<void> {
  const retryInfo = testInfo.retry > 0 ? ` [Retry ${testInfo.retry}]` : '';
  console.log(
    `${colors.blue}${emoji} [PASSO${retryInfo}]${colors.reset} ${message}`
  );
}

/**
 * Registra início de teste
 */
export async function logTestStart(testInfo: TestInfo): Promise<void> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(
    `${colors.bright}${colors.magenta}🧪 INICIANDO TESTE${colors.reset}`
  );
  console.log(
    `${colors.bright}   Título: ${testInfo.title}${colors.reset}`
  );
  console.log(
    `${colors.dim}   Arquivo: ${testInfo.file}${colors.reset}`
  );
  console.log(
    `${colors.dim}   Projeto: ${testInfo.project.name}${colors.reset}`
  );
  console.log(
    `${colors.dim}   Browser: ${testInfo.browser?.name() || 'unknown'}${colors.reset}`
  );
  console.log(
    `${colors.dim}   Output: ${testInfo.outputDir}${colors.reset}`
  );
  console.log(`${'='.repeat(70)}\n`);
}

/**
 * Registra fim de teste com resumo
 */
export async function logTestEnd(
  testInfo: TestInfo,
  status: 'passed' | 'failed' | 'skipped' | 'interrupted'
): Promise<void> {
  const emoji = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️';
  const color = status === 'passed' ? colors.green : status === 'failed' ? colors.red : colors.yellow;
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(
    `${color}${emoji} TESTE ${status.toUpperCase()}${colors.reset}`
  );
  console.log(
    `${colors.dim}   Duração: ${testInfo.duration}ms${colors.reset}`
  );
  console.log(
    `${colors.dim}   Timeout: ${testInfo.timeout}ms${colors.reset}`
  );
  
  if (status === 'failed' && testInfo.errors.length > 0) {
    console.log(`\n${colors.red}❌ ERROS:${colors.reset}`);
    testInfo.errors.forEach((err, i) => {
      console.log(`   ${i + 1}. ${err.message}`);
    });
  }
  
  console.log(`${'='.repeat(70)}\n`);
}

/**
 * Registra erro com detalhes
 */
export async function logError(
  message: string,
  error?: Error | unknown
): Promise<void> {
  console.log(`\n${colors.red}❌ [ERRO]${colors.reset} ${message}`);
  if (error instanceof Error) {
    console.log(`${colors.dim}   Message: ${error.message}${colors.reset}`);
    console.log(`${colors.dim}   Stack: ${error.stack}${colors.reset}`);
  } else if (typeof error === 'string') {
    console.log(`${colors.dim}   ${error}${colors.reset}`);
  }
}

/**
 * Registra sucesso com detalhes
 */
export async function logSuccess(message: string): Promise<void> {
  console.log(`\n${colors.green}✅ [SUCESSO]${colors.reset} ${message}`);
}

/**
 * Espera e loga loading
 */
export async function logWaiting(message: string): Promise<void> {
  console.log(`${colors.yellow}⏳ [AGUARDANDO]${colors.reset} ${message}`);
}

/**
 * Navega para URL com log
 */
export async function navigateWithLog(
  page: Page,
  testInfo: TestInfo,
  url: string,
  description?: string
): Promise<void> {
  await logStep(testInfo, `Navegando para: ${description || url}`, '🧭');
  await page.goto(url);
  await takeScreenshot(page, testInfo, {
    label: `nav-${description || url.replace(/\W+/g, '-')}`,
    type: 'step',
  });
}

/**
 * Preenche input com log
 */
export async function fillWithLog(
  page: Page,
  testInfo: TestInfo,
  selector: string,
  value: string,
  description?: string
): Promise<void> {
  await logStep(testInfo, `Preenchendo ${description || selector}: "${value}"`, '⌨️');
  await page.fill(selector, value);
  await takeScreenshot(page, testInfo, {
    label: `fill-${description || selector.replace(/\W+/g, '-')}`,
    type: 'step',
  });
}

/**
 * Clica em elemento com log
 */
export async function clickWithLog(
  page: Page,
  testInfo: TestInfo,
  selector: string,
  description?: string
): Promise<void> {
  await logStep(testInfo, `Clicando em: ${description || selector}`, '🖱️');
  await page.click(selector);
  await takeScreenshot(page, testInfo, {
    label: `click-${description || selector.replace(/\W+/g, '-')}`,
    type: 'step',
  });
}

/**
 * Espera elemento com log
 */
export async function waitForWithLog(
  page: Page,
  testInfo: TestInfo,
  selector: string,
  state?: 'visible' | 'hidden' | 'attached' | 'detached',
  description?: string
): Promise<void> {
  await logStep(testInfo, `Aguardando ${state || 'visible'}: ${description || selector}`, '⏳');
  await page.waitForSelector(selector, { state });
  await takeScreenshot(page, testInfo, {
    label: `wait-${description || selector.replace(/\W+/g, '-')}`,
    type: 'step',
  });
}

/**
 * Assert com log e screenshot em caso de falha
 */
export async function expectWithScreenshot(
  page: Page,
  testInfo: TestInfo,
  assertion: () => Promise<void>,
  description: string
): Promise<void> {
  await logStep(testInfo, `Verificando: ${description}`, '🔍');
  
  try {
    await assertion();
    await logSuccess(description);
  } catch (error) {
    await logError(`Falha na verificação: ${description}`, error);
    await takeScreenshot(page, testInfo, {
      label: `assert-fail-${description.replace(/\W+/g, '-')}`,
      type: 'error',
    });
    throw error;
  }
}
