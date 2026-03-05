/**
 * Custom Reporter para Playwright
 * 
 * Fornece logs detalhados e resumo formatado dos testes
 */

import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Cores para terminal
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
  white: '\x1b[37m',
};

/**
 * Formata duração em formato legível
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Formata timestamp
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

class CustomReporter implements Reporter {
  private startTime: Date = new Date();
  private testCount = 0;
  private passCount = 0;
  private failCount = 0;
  private skipCount = 0;
  private totalDuration = 0;
  private screenshotCount = 0;
  private videoCount = 0;
  private traceCount = 0;

  /**
   * Chamado no início dos testes
   */
  onBegin(config: FullConfig, suite: Suite) {
    this.startTime = new Date();
    this.testCount = suite.allTests().length;
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`${colors.bright}${colors.magenta}🚀 MARCIO NATURAL - TESTES E2E${colors.reset}`);
    console.log(`${'='.repeat(70)}`);
    console.log(`${colors.cyan}📊 Total de testes: ${this.testCount}${colors.reset}`);
    console.log(`${colors.cyan}🌐 Base URL: ${config.webServer?.url || config.projects[0].use.baseURL}${colors.reset}`);
    console.log(`${colors.cyan}🔧 Workers: ${config.workers}${colors.reset}`);
    console.log(`${colors.cyan}📁 Output: ${path.join(process.cwd(), 'e2e', config.outputDir || 'test-results')}${colors.reset}`);
    console.log(`${'='.repeat(70)}\n`);
  }

  /**
   * Chamado antes de cada teste
   */
  onTestBegin(test: TestCase) {
    const testPath = test.location.file.replace(/.*e2e\//, '');
    console.log(`\n${colors.dim}─────────────────────────────────────────────────────────────────${colors.reset}`);
    console.log(`${colors.blue}🧪 [TESTE]${colors.reset} ${colors.bright}${test.title}${colors.reset}`);
    console.log(`${colors.dim}   📁 ${testPath}${colors.reset}`);
    console.log(`${colors.dim}   🏷️  Tags: ${test.tags.join(' ') || 'nenhuma'}${colors.reset}`);
  }

  /**
   * Chamado após cada teste
   */
  onTestEnd(test: TestCase, result: TestResult) {
    const status = result.status;
    const duration = result.duration;
    this.totalDuration += duration;

    // Atualiza contadores
    if (status === 'passed') this.passCount++;
    else if (status === 'failed') this.failCount++;
    else if (status === 'skipped') this.skipCount++;

    // Conta attachments
    const screenshots = result.attachments.filter(a => a.contentType?.includes('image'));
    const videos = result.attachments.filter(a => a.contentType?.includes('video'));
    const traces = result.attachments.filter(a => a.name === 'trace');
    
    this.screenshotCount += screenshots.length;
    this.videoCount += videos.length;
    this.traceCount += traces.length;

    // Log de status
    const emoji = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️';
    const color = status === 'passed' ? colors.green : status === 'failed' ? colors.red : colors.yellow;
    
    console.log(`\n${color}${emoji} ${status.toUpperCase()}${colors.reset} (${formatDuration(duration)})`);

    // Logs de erros
    if (status === 'failed' && result.errors.length > 0) {
      console.log(`\n${colors.red}❌ ERROS:${colors.reset}`);
      result.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.message}`);
        if (err.stack) {
          console.log(`      ${colors.dim}${err.stack.split('\n')[1]}${colors.reset}`);
        }
      });
    }

    // Logs de attachments
    if (result.attachments.length > 0) {
      console.log(`\n${colors.cyan}📎 ANEXOS:${colors.reset}`);
      result.attachments.forEach(att => {
        if (att.path) {
          console.log(`   - ${att.name}: ${colors.dim}${att.path}${colors.reset}`);
        }
      });
    }

    // Logs de retry
    if (result.retry > 0) {
      console.log(`\n${colors.yellow}🔄 Retries: ${result.retry}${colors.reset}`);
    }
  }

  /**
   * Chamado no final de todos os testes
   */
  onEnd(result: FullResult) {
    const endTime = new Date();
    const totalDuration = endTime.getTime() - this.startTime.getTime();

    console.log(`\n\n${'='.repeat(70)}`);
    console.log(`${colors.bright}${colors.magenta}📊 RESUMO FINAL - MARCIO NATURAL E2E${colors.reset}`);
    console.log(`${'='.repeat(70)}`);

    // Status geral
    const overallStatus = result.status === 'passed' ? '✅ PASSOU' : '❌ FALHOU';
    const statusColor = result.status === 'passed' ? colors.green : colors.red;
    console.log(`\n${statusColor}${colors.bright}${overallStatus}${colors.reset}`);

    // Estatísticas de testes
    console.log(`\n${colors.bright}📈 ESTATÍSTICAS:${colors.reset}`);
    console.log(`   ${colors.green}✅ Passaram:${colors.reset} ${this.passCount}/${this.testCount} (${((this.passCount / this.testCount) * 100).toFixed(1)}%)`);
    console.log(`   ${colors.red}❌ Falharam:${colors.reset} ${this.failCount}/${this.testCount}`);
    console.log(`   ${colors.yellow}⚠️  Skipados:${colors.reset} ${this.skipCount}/${this.testCount}`);

    // Duração
    console.log(`\n${colors.bright}⏱️  TEMPO:${colors.reset}`);
    console.log(`   Total: ${formatDuration(totalDuration)}`);
    console.log(`   Média: ${formatDuration(this.testCount > 0 ? totalDuration / this.testCount : 0)} por teste`);

    // Attachments
    console.log(`\n${colors.bright}📎 MÍDIAS GERADAS:${colors.reset}`);
    console.log(`   📸 Screenshots: ${this.screenshotCount}`);
    console.log(`   🎬 Vídeos: ${this.videoCount}`);
    console.log(`   🔍 Traces: ${this.traceCount}`);

    // Caminhos dos relatórios
    console.log(`\n${colors.bright}📁 RESULTADOS:${colors.reset}`);
    const cwd = process.cwd();
    console.log(`   HTML Report: ${colors.cyan}${path.join(cwd, 'e2e', 'playwright-report', 'index.html')}${colors.reset}`);
    console.log(`   Screenshots: ${colors.cyan}${path.join(cwd, 'e2e', 'screenshots')}${colors.reset}`);
    console.log(`   Test Results: ${colors.cyan}${path.join(cwd, 'e2e', 'test-results')}${colors.reset}`);
    console.log(`   Vídeos: ${colors.cyan}${path.join(cwd, 'e2e', 'test-results')}${colors.reset}`);

    // Timestamp
    console.log(`\n${colors.dim}🕐 Concluído em: ${formatTimestamp(endTime)}${colors.reset}`);
    console.log(`${'='.repeat(70)}\n`);

    // Dica para visualizar relatório
    if (this.failCount === 0) {
      console.log(`${colors.green}🎉 Todos os testes passaram!${colors.reset}`);
      console.log(`${colors.dim}💡 Dica: Execute \`bun run e2e:report\` para ver o relatório HTML${colors.reset}\n`);
    } else {
      console.log(`${colors.red}⚠️  Alguns testes falharam. Verifique os logs acima.${colors.reset}`);
      console.log(`${colors.dim}💡 Dica: Execute \`bun run e2e:debug\` para debugar os testes falhos${colors.reset}\n`);
    }
  }

  /**
   * Chamado em caso de erro global
   */
  onError(error: Error | unknown) {
    console.log(`\n${colors.red}❌ [ERRO GLOBAL]${colors.reset}`);
    if (error instanceof Error) {
      console.log(`${colors.bright}Message:${colors.reset} ${error.message}`);
      console.log(`${colors.dim}Stack:${colors.reset} ${error.stack}`);
    } else {
      console.log(error);
    }
  }

  /**
   * Chamado em caso de warning
   */
  onStdOut(chunk: string | Buffer, test?: TestCase) {
    const output = chunk.toString();
    if (output.trim()) {
      // Filtra logs do Playwright interno
      if (!output.includes('Playwright') && !output.includes('Listening on')) {
        console.log(`${colors.dim}${output}${colors.reset}`);
      }
    }
  }

  onStdErr(chunk: string | Buffer, test?: TestCase) {
    const output = chunk.toString();
    if (output.trim()) {
      console.error(`${colors.yellow}${output}${colors.reset}`);
    }
  }
}

export default CustomReporter;
