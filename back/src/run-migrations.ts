#!/usr/bin/env bun
/**
 * Script standalone para executar migrações
 * Útil para execução manual ou em scripts de deploy
 */

import { initDatabase } from './db';
import { MigrationManager } from './migrations';

console.log('🚀 Executando migrações do banco de dados...\n');

// Inicializa o banco (cria schema e seeds se necessário)
initDatabase();

console.log('');

// Executa todas as migrações pendentes
MigrationManager.runAll();

console.log('\n✅ Todas as migrações foram processadas!');
