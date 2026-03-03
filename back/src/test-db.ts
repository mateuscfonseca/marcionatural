import { Database } from 'bun:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { dbProvider } from './db-provider';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = join(__dirname, '..', 'data', 'test.db');

/**
 * IDs fixos dos seeds para uso em testes
 * Evita criação desnecessária de activity types duplicados
 */
export const SEED_IDS = {
  categories: {
    refeicao: 1,
    exercicio: 2,
    projeto_pessoal: 3,
  },
  activityTypes: {
    alimentacaoLimpa: 1,
    alimentacaoSuja: 2,
    exercicioFisico: 3,
  },
} as const;

/**
 * Cria o banco de dados de teste com schema + seeds + migrações
 * Executado apenas uma vez no início dos testes
 */
export function createTestDatabase() {
  // Remove arquivo de teste existente
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  if (fs.existsSync(TEST_DB_PATH + '-wal')) {
    fs.unlinkSync(TEST_DB_PATH + '-wal');
  }
  if (fs.existsSync(TEST_DB_PATH + '-shm')) {
    fs.unlinkSync(TEST_DB_PATH + '-shm');
  }

  // Garante diretório data
  const dataDir = join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Cria banco
  const testDb = new Database(TEST_DB_PATH);
  testDb.exec('PRAGMA journal_mode = WAL');

  // Executa schema
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  testDb.exec(schema);

  // Executa seeds
  const seedsPath = join(__dirname, 'seeds.sql');
  const seeds = fs.readFileSync(seedsPath, 'utf-8');
  const statements = seeds.split(';').filter(s => s.trim().length > 0);
  for (const statement of statements) {
    try {
      testDb.exec(statement);
    } catch {
      // Ignora erros de inserts duplicados
    }
  }

  // Executa migrações manualmente (já que MigrationManager usa db principal)
  // Migração 001: add-entry-date
  const hasEntryDate = testDb.prepare("PRAGMA table_info(user_entries)").all()
    .some((col: { name: string }) => col.name === 'entry_date');
  if (!hasEntryDate) {
    testDb.run('ALTER TABLE user_entries ADD COLUMN entry_date DATE');
  }

  // Migração 002: add-user-deleted-at
  const hasDeletedAt = testDb.prepare("PRAGMA table_info(users)").all()
    .some((col: { name: string }) => col.name === 'deleted_at');
  if (!hasDeletedAt) {
    testDb.run('ALTER TABLE users ADD COLUMN deleted_at DATETIME');
    testDb.run('CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at)');
  }

  // Migração 003: fix-null-entry-date (já está coberto pelo schema atual)

  // Injeta no provider
  dbProvider.setTestDb(testDb);

  console.log('✅ Banco de teste criado com schema + seeds + migrações');
}

/**
 * Limpa dados de teste entre testes
 * Remove entradas de tabelas que serão modificadas pelos testes
 */
export function resetTestData() {
  const db = dbProvider.getDb();

  // Limpa dados na ordem correta (respeitando foreign keys)
  db.run('DELETE FROM project_daily_logs');
  db.run('DELETE FROM user_entries');
  db.run('DELETE FROM personal_projects');
  db.run('DELETE FROM activity_types WHERE name LIKE "%Teste%" OR id > 100');
  db.run('DELETE FROM users WHERE id > 100 OR username LIKE "%test%" OR username = "user_deleted_test" OR username = "user_deleted_count_test"');
}

/**
 * Fecha o banco de dados de teste
 */
export function closeTestDatabase() {
  dbProvider.reset();
  
  // Remove arquivo do banco de teste
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  if (fs.existsSync(TEST_DB_PATH + '-wal')) {
    fs.unlinkSync(TEST_DB_PATH + '-wal');
  }
  if (fs.existsSync(TEST_DB_PATH + '-shm')) {
    fs.unlinkSync(TEST_DB_PATH + '-shm');
  }
}

/**
 * Retorna a instância do banco de dados de teste
 */
export function getTestDb(): Database {
  return dbProvider.getDb();
}
