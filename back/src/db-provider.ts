import { Database } from 'bun:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Provedor de banco de dados com suporte a injeção de dependência
 * Permite trocar o banco em ambientes de teste
 */
class DatabaseProvider {
  private db: Database;
  private testDb: Database | null = null;

  constructor() {
    this.db = this.createMainDatabase();
  }

  private createMainDatabase(): Database {
    const isProduction = process.env.NODE_ENV === 'production';
    const dbPath = isProduction
      ? '/app/data/marcionatural.db'
      : join(__dirname, '..', 'data', 'marcionatural.db');

    const dataDir = isProduction ? '/app/data' : join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const db = new Database(dbPath);
    db.exec('PRAGMA journal_mode = WAL');
    return db;
  }

  /**
   * Retorna o banco de dados atual
   * Em testes, retorna o banco de teste injetado
   */
  getDb(): Database {
    return this.testDb ?? this.db;
  }

  /**
   * Injeta um banco de dados de teste
   */
  setTestDb(db: Database) {
    this.testDb = db;
  }

  /**
   * Remove o banco de teste, voltando ao principal
   */
  reset() {
    if (this.testDb) {
      this.testDb.close();
      this.testDb = null;
    }
  }

  /**
   * Fecha o banco principal
   */
  close() {
    this.reset();
    this.db.close();
  }
}

// Singleton exportado
export const dbProvider = new DatabaseProvider();

/**
 * Função utilitária para obter o banco de dados
 * Usada pelos serviços
 */
export function getDb(): Database {
  return dbProvider.getDb();
}
