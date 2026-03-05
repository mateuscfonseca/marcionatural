/**
 * Seed específico para testes E2E
 * Cria usuários e dados previsíveis para testes de interface
 * 
 * Este script:
 * 1. Cria o banco de dados com schema + seeds básicos
 * 2. Executa todas as migrations registradas usando dbProvider
 * 3. Popula com dados de teste para E2E
 *
 * Uso:
 *   DATABASE_PATH=./data/test.db bun run src/scripts/seed-e2e.ts
 */

import { Database } from 'bun:sqlite';
import bcrypt from 'bcryptjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { dbProvider } from '../db-provider';
import { MigrationManager } from '../migrations';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuração de usuários de teste (IDs fixos para previsibilidade)
const E2E_USERS = [
  { id: 1001, username: 'test_user_1', password: 'teste123' },
  { id: 1002, username: 'test_user_2', password: 'teste123' },
  { id: 1003, username: 'test_user_3', password: 'teste123' },
  { id: 1004, username: 'test_leader', password: 'teste123' },
  { id: 1005, username: 'test_reporter', password: 'teste123' },
];

interface HistoricalEntry {
  daysAgo: number;
  activityTypeName: string;
  description: string;
  categoryId: number;
  isPositive: boolean;
  basePoints: number;
}

const HISTORICAL_DATA: Record<string, HistoricalEntry[]> = {
  'test_leader': [
    { daysAgo: 5, activityTypeName: 'Alimentacao Limpa', description: 'Cafe saudavel', categoryId: 1, isPositive: true, basePoints: 10 },
    { daysAgo: 5, activityTypeName: 'Exercicio Fisico', description: 'Corrida 5km', categoryId: 2, isPositive: true, basePoints: 5 },
    { daysAgo: 4, activityTypeName: 'Alimentacao Limpa', description: 'Almoco com salada', categoryId: 1, isPositive: true, basePoints: 10 },
    { daysAgo: 4, activityTypeName: 'Exercicio Fisico', description: 'Academia', categoryId: 2, isPositive: true, basePoints: 5 },
    { daysAgo: 3, activityTypeName: 'Alimentacao Limpa', description: 'Jantar leve', categoryId: 1, isPositive: true, basePoints: 10 },
    { daysAgo: 3, activityTypeName: 'Exercicio Fisico', description: 'Yoga', categoryId: 2, isPositive: true, basePoints: 5 },
    { daysAgo: 2, activityTypeName: 'Alimentacao Limpa', description: 'Cafe da manha', categoryId: 1, isPositive: true, basePoints: 10 },
    { daysAgo: 2, activityTypeName: 'Exercicio Fisico', description: 'Natacao', categoryId: 2, isPositive: true, basePoints: 5 },
    { daysAgo: 1, activityTypeName: 'Alimentacao Limpa', description: 'Refeicao equilibrada', categoryId: 1, isPositive: true, basePoints: 10 },
    { daysAgo: 1, activityTypeName: 'Exercicio Fisico', description: 'Treino intenso', categoryId: 2, isPositive: true, basePoints: 5 },
    { daysAgo: 0, activityTypeName: 'Alimentacao Limpa', description: 'Hoje saudavel', categoryId: 1, isPositive: true, basePoints: 10 },
    { daysAgo: 0, activityTypeName: 'Exercicio Fisico', description: 'Corrida hoje', categoryId: 2, isPositive: true, basePoints: 5 },
  ],
  'test_user_1': [
    { daysAgo: 3, activityTypeName: 'Alimentacao Limpa', description: 'Refeicao saudavel', categoryId: 1, isPositive: true, basePoints: 10 },
    { daysAgo: 2, activityTypeName: 'Exercicio Fisico', description: 'Caminhada', categoryId: 2, isPositive: true, basePoints: 5 },
    { daysAgo: 1, activityTypeName: 'Alimentacao Limpa', description: 'Almoco leve', categoryId: 1, isPositive: true, basePoints: 10 },
    { daysAgo: 0, activityTypeName: 'Exercicio Fisico', description: 'Treino hoje', categoryId: 2, isPositive: true, basePoints: 5 },
  ],
  'test_user_2': [
    { daysAgo: 4, activityTypeName: 'Alimentacao Limpa', description: 'Segunda saudavel', categoryId: 1, isPositive: true, basePoints: 10 },
    { daysAgo: 3, activityTypeName: 'Alimentacao Suja', description: 'Fast food', categoryId: 1, isPositive: false, basePoints: -10 },
    { daysAgo: 2, activityTypeName: 'Alimentacao Limpa', description: 'Recuperou', categoryId: 1, isPositive: true, basePoints: 10 },
    { daysAgo: 1, activityTypeName: 'Usar Tabaco', description: 'Fumou', categoryId: 4, isPositive: false, basePoints: -5 },
    { daysAgo: 0, activityTypeName: 'Alimentacao Limpa', description: 'Hoje ok', categoryId: 1, isPositive: true, basePoints: 10 },
  ],
  'test_user_3': [
    { daysAgo: 1, activityTypeName: 'Alimentacao Limpa', description: 'Ontem', categoryId: 1, isPositive: true, basePoints: 10 },
    { daysAgo: 0, activityTypeName: 'Exercicio Fisico', description: 'Hoje', categoryId: 2, isPositive: true, basePoints: 5 },
  ],
};

const PAGINATION_TEST_DATA = Array.from({ length: 25 }, (_, i) => ({
  daysAgo: i % 10,
  activityTypeName: i % 2 === 0 ? 'Alimentacao Limpa' : 'Exercicio Fisico',
  description: `Entrada de paginacao #${i + 1}`,
  categoryId: i % 2 === 0 ? 1 : 2,
  isPositive: true,
  basePoints: i % 2 === 0 ? 10 : 5,
}));

const REPORT_TEST_DATA = [
  { daysAgo: 1, activityTypeName: 'Alimentacao Limpa', description: 'Entrada suspeita para report', categoryId: 1, isPositive: true, basePoints: 10 },
];

let testDb: Database;

function getOrCreateActivityType(name: string, categoryId: number, isPositive: boolean, basePoints: number): number {
  const db = dbProvider.getDb();
  const existing = db.prepare('SELECT id FROM activity_types WHERE name = ?').get(name) as { id: number } | undefined;
  if (existing) {
    return existing.id;
  }
  const result = db.prepare(`
    INSERT INTO activity_types (name, category_id, is_positive, base_points, is_validated)
    VALUES (?, ?, ?, ?, TRUE)
  `).run(name, categoryId, isPositive, basePoints);
  return result.lastInsertRowid as number;
}

function createUsers() {
  console.log('📝 Criando usuários de teste E2E...');
  const userIds: Record<string, number> = {};
  const db = dbProvider.getDb();

  for (const user of E2E_USERS) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(user.username) as { id: number } | undefined;
    if (existing) {
      console.log(`  ⚠️  Usuário "${user.username}" já existe (ID: ${existing.id})`);
      userIds[user.username] = existing.id;
      continue;
    }
    const passwordHash = bcrypt.hashSync(user.password, 10);
    const result = db.prepare(`
      INSERT INTO users (id, username, password_hash)
      VALUES (?, ?, ?)
    `).run(user.id, user.username, passwordHash);
    userIds[user.username] = user.id;
    console.log(`  ✅ Usuário "${user.username}" criado (ID: ${user.id})`);
  }
  return userIds;
}

function createHistoricalEntries(userIds: Record<string, number>) {
  console.log('\n📊 Criando entradas históricas para testes...');
  const db = dbProvider.getDb();
  const activityTypeCache: Record<string, number> = {};

  for (const [username, entries] of Object.entries(HISTORICAL_DATA)) {
    const userId = userIds[username];
    if (!userId) continue;
    console.log(`  📝 ${username}:`);
    for (const entry of entries) {
      const date = new Date();
      date.setDate(date.getDate() - entry.daysAgo);
      const entryDate = date.toISOString().split('T')[0];
      if (!activityTypeCache[entry.activityTypeName]) {
        activityTypeCache[entry.activityTypeName] = getOrCreateActivityType(
          entry.activityTypeName,
          entry.categoryId,
          entry.isPositive,
          entry.basePoints
        );
      }
      const activityTypeId = activityTypeCache[entry.activityTypeName];
      db.prepare(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `).run(userId, activityTypeId, entry.description, entryDate);
      console.log(`    - ${entry.daysAgo === 0 ? 'Hoje' : `${entry.daysAgo} dias atrás`}: ${entry.activityTypeName}`);
    }
  }
}

function createPaginationTestData(userIds: Record<string, number>) {
  console.log('\n📄 Criando entradas para teste de paginação...');
  const db = dbProvider.getDb();
  const userId = userIds['test_user_1'];
  if (!userId) return;
  const activityTypeCache: Record<string, number> = {};
  for (const entry of PAGINATION_TEST_DATA) {
    const date = new Date();
    date.setDate(date.getDate() - entry.daysAgo);
    const entryDate = date.toISOString().split('T')[0];
    if (!activityTypeCache[entry.activityTypeName]) {
      activityTypeCache[entry.activityTypeName] = getOrCreateActivityType(
        entry.activityTypeName,
        entry.categoryId,
        entry.isPositive,
        entry.basePoints
      );
    }
    const activityTypeId = activityTypeCache[entry.activityTypeName];
    db.prepare(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
      VALUES (?, ?, ?, ?)
    `).run(userId, activityTypeId, entry.description, entryDate);
  }
  console.log(`  ✅ 25 entradas criadas para teste de paginação`);
}

function createReportTestData(userIds: Record<string, number>) {
  console.log('\n🚨 Criando entradas para teste de reports...');
  const db = dbProvider.getDb();
  const reporterId = userIds['test_reporter'];
  const targetUsername = 'test_user_2';
  const targetId = userIds[targetUsername];
  if (!reporterId || !targetId) return;
  const activityTypeCache: Record<string, number> = {};

  for (const entry of REPORT_TEST_DATA) {
    const date = new Date();
    date.setDate(date.getDate() - entry.daysAgo);
    const entryDate = date.toISOString().split('T')[0];
    if (!activityTypeCache[entry.activityTypeName]) {
      activityTypeCache[entry.activityTypeName] = getOrCreateActivityType(
        entry.activityTypeName,
        entry.categoryId,
        entry.isPositive,
        entry.basePoints
      );
    }
    const activityTypeId = activityTypeCache[entry.activityTypeName];
    const result = db.prepare(`
      INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
      VALUES (?, ?, ?, ?)
    `).run(targetId, activityTypeId, entry.description, entryDate);
    const entryId = result.lastInsertRowid as number;
    for (let i = 0; i < 3; i++) {
      const reporterUserId = [userIds['test_user_1'], userIds['test_user_3'], reporterId][i];
      if (reporterUserId) {
        db.prepare(`
          INSERT OR IGNORE INTO entry_reports (entry_id, reporter_user_id)
          VALUES (?, ?)
        `).run(entryId, reporterUserId);
      }
    }
    db.prepare(`
      UPDATE user_entries 
      SET is_invalidated = TRUE, invalidated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(entryId);
    console.log(`  ✅ Entrada de report criada e invalidada (ID: ${entryId})`);
  }
}

function createProjectsTestData(userIds: Record<string, number>) {
  console.log('\n📁 Criando projetos para testes...');
  const db = dbProvider.getDb();
  const userId = userIds['test_user_1'];
  if (!userId) return;
  const projectResult = db.prepare(`
    INSERT INTO personal_projects (user_id, name, description, weekly_hours_goal, is_active)
    VALUES (?, ?, ?, ?, TRUE)
  `).run(userId, 'Projeto de Teste', 'Projeto criado para testes E2E', 10);
  const projectId = projectResult.lastInsertRowid as number;
  const today = new Date();
  const weekNumber = Math.ceil(today.getDate() / 7);
  const year = today.getFullYear();
  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    db.prepare(`
      INSERT OR IGNORE INTO project_daily_logs (project_id, user_id, date, duration_minutes, week_number, year)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(projectId, userId, dateStr, 60, weekNumber, year);
  }
  console.log(`  ✅ Projeto criado com logs diários (ID: ${projectId})`);
}

function cleanPreviousE2eData() {
  console.log('🧹 Limpando dados de testes E2E anteriores...');
  const db = dbProvider.getDb();
  db.prepare('DELETE FROM project_daily_logs WHERE project_id IN (SELECT id FROM personal_projects WHERE user_id >= 1000)').run();
  db.prepare('DELETE FROM entry_reports WHERE entry_id IN (SELECT id FROM user_entries WHERE user_id >= 1000)').run();
  db.prepare('DELETE FROM activity_type_votes WHERE user_id >= 1000').run();
  db.prepare('DELETE FROM user_entries WHERE user_id >= 1000').run();
  db.prepare('DELETE FROM personal_projects WHERE user_id >= 1000').run();
  db.prepare('DELETE FROM activity_types WHERE id > 100').run();
  db.prepare('DELETE FROM users WHERE id >= 1000').run();
  console.log('  ✅ Dados anteriores limpos');
}

function runMigrations() {
  console.log('\n🔄 Executando migrations com dbProvider...\n');
  MigrationManager.runAll();
}

function main() {
  const dbPath = process.env.DATABASE_PATH || './data/test.db';
  console.log(`🌱 Iniciando seed E2E (banco: ${dbPath})...\n`);

  try {
    const dataDir = dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    if (fs.existsSync(dbPath + '-wal')) {
      fs.unlinkSync(dbPath + '-wal');
    }
    if (fs.existsSync(dbPath + '-shm')) {
      fs.unlinkSync(dbPath + '-shm');
    }

    testDb = new Database(dbPath);
    testDb.exec('PRAGMA journal_mode = WAL');
    dbProvider.setTestDb(testDb);

    console.log('📐 Criando schema e seeds básicos...\n');
    const schemaPath = join(__dirname, '..', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    testDb.exec(schema);
    console.log('  ✅ Schema base criado');

    const seedsPath = join(__dirname, '..', 'seeds.sql');
    const seeds = fs.readFileSync(seedsPath, 'utf-8');
    const statements = seeds.split(';').filter(s => s.trim().length > 0);
    for (const statement of statements) {
      try {
        testDb.exec(statement);
      } catch {
        // Ignora erros de inserts duplicados
      }
    }
    console.log('  ✅ Seeds básicos executados');

    runMigrations();
    console.log('\n✅ Schema + Migrations concluídos!\n');

    const userIds = createUsers();
    createHistoricalEntries(userIds);
    createPaginationTestData(userIds);
    createReportTestData(userIds);
    createProjectsTestData(userIds);

    console.log('\n✅ Seed E2E concluído com sucesso!');
    console.log('\n💡 Credenciais para testes:');
    for (const user of E2E_USERS) {
      console.log(`   ${user.username} / ${user.password}`);
    }
  } catch (error) {
    console.error('❌ Erro ao executar seed E2E:', error);
    process.exit(1);
  } finally {
    if (testDb) {
      testDb.close();
    }
    dbProvider.reset();
    const dbPath = process.env.DATABASE_PATH || './data/test.db';
    if (fs.existsSync(dbPath + '-wal')) {
      fs.unlinkSync(dbPath + '-wal');
    }
    if (fs.existsSync(dbPath + '-shm')) {
      fs.unlinkSync(dbPath + '-shm');
    }
  }
}

main();
