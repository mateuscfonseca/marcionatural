import { Database } from 'bun:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Provedor de banco de dados com suporte a injeção de dependência
 * 
 * Este é o ÚNICO ponto de acesso ao banco de dados na aplicação.
 * 
 * Uso:
 * - Produção/Dev normal: getDb() usa DATABASE_PATH do ambiente ou padrão
 * - Testes: setTestDb(db) injeta banco de teste
 * 
 * @example
 * import { dbProvider } from './db-provider';
 * const db = dbProvider.getDb();
 */
class DatabaseProvider {
  private db: Database | null = null;
  private testDb: Database | null = null;
  private initialized: boolean = false;

  /**
   * Retorna o banco de dados atual
   * - Em testes, retorna o banco de teste injetado
   * - Caso contrário, cria/retorna o banco principal
   */
  getDb(): Database {
    // Em testes, retorna o banco injetado
    if (this.testDb) {
      return this.testDb;
    }

    // Cria banco principal se não existe
    if (!this.db) {
      this.db = this.createDatabase();
    }

    return this.db;
  }

  /**
   * Cria e configura o banco de dados
   */
  private createDatabase(): Database {
    // Prioridade para DATABASE_PATH do ambiente
    const DB_PATH = process.env.DATABASE_PATH
      || (process.env.NODE_ENV === 'production'
        ? '/app/data/marcionatural.db'
        : join(__dirname, '..', 'data', 'marcionatural.db'));

    // Garante que o diretório existe
    const dataDir = dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Abre o banco de dados
    const db = new Database(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');

    console.log(`\n🔒 [DatabaseProvider] Database path: ${DB_PATH}`);
    console.log(`🔒 [DatabaseProvider] DATABASE_PATH env: ${process.env.DATABASE_PATH || 'not set'}`);
    console.log(`🔒 [DatabaseProvider] NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`🔒 [DatabaseProvider] testDb is set: ${this.testDb !== null}\n`);

    return db;
  }

  /**
   * Inicializa o banco com schema e seeds (apenas em desenvolvimento)
   * 
   * Skip automaticamente se:
   * - NODE_ENV !== 'development'
   * - SKIP_DB_INIT === 'true'
   */
  initDatabase(): void {
    if (this.initialized) {
      console.log('[DatabaseProvider] Database already initialized');
      return;
    }

    // Check se deve skipar
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    const shouldSkip = process.env.SKIP_DB_INIT === 'true';
    
    if (!isDev || shouldSkip) {
      console.log('[DatabaseProvider] Skipping init (not in dev or SKIP_DB_INIT=true)');
      console.log(`[DatabaseProvider] NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
      console.log(`[DatabaseProvider] SKIP_DB_INIT: ${process.env.SKIP_DB_INIT || 'not set'}`);
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      console.log('[DatabaseProvider] Skipping init in production');
      return;
    }

    const db = this.getDb();

    // Lê e executa o schema
    const schemaPath = join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      db.exec(schema);
      console.log('[DatabaseProvider] Schema executed');
    }

    // Lê e executa os seeds
    const seedsPath = join(__dirname, 'seeds.sql');
    if (fs.existsSync(seedsPath)) {
      const seeds = fs.readFileSync(seedsPath, 'utf-8');
      const statements = seeds.split(';').filter(s => s.trim().length > 0);
      for (const statement of statements) {
        try {
          db.exec(statement);
        } catch (e) {
          // Ignora erros de inserts duplicados
        }
      }
      console.log('[DatabaseProvider] Seeds executed');
    }

    this.initialized = true;
    console.log('[DatabaseProvider] Database initialized successfully!');
  }

  /**
   * Injeta um banco de dados de teste
   * Usado apenas em testes E2E e unitários
   */
  setTestDb(db: Database): void {
    this.testDb = db;
    console.log('[DatabaseProvider] Test database injected');
  }

  /**
   * Remove o banco de teste, voltando ao principal
   */
  reset(): void {
    if (this.testDb) {
      this.testDb.close();
      this.testDb = null;
      console.log('[DatabaseProvider] Test database removed');
    }
  }

  /**
   * Fecha o banco principal
   */
  close(): void {
    this.reset();
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[DatabaseProvider] Database closed');
    }
  }

  /**
   * Retorna o caminho do banco de dados atual
   */
  getDatabasePath(): string {
    if (this.testDb) {
      return 'test-db-injected';
    }
    return process.env.DATABASE_PATH 
      || (process.env.NODE_ENV === 'production'
        ? '/app/data/marcionatural.db'
        : join(__dirname, '..', 'data', 'marcionatural.db'));
  }
}

// Singleton exportado
export const dbProvider = new DatabaseProvider();

/**
 * Função utilitária para obter o banco de dados
 * Esta é a função que deve ser usada em toda a aplicação
 * 
 * @example
 * import { getDb } from './db-provider';
 * const db = getDb();
 */
export function getDb(): Database {
  return dbProvider.getDb();
}

/**
 * Inicializa o banco de dados (schema + seeds)
 * Deve ser chamado apenas uma vez no início da aplicação
 */
export function initDatabase(): void {
  dbProvider.initDatabase();
}
