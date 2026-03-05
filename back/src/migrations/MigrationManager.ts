import { dbProvider } from '../db-provider';
import type { Migration } from './Migration';
import type { Database } from 'bun:sqlite';

/**
 * Gerenciador de migrações do banco de dados
 *
 * Responsável por:
 * - Registrar migrações
 * - Rastrear quais migrações já foram aplicadas
 * - Executar migrações pendentes em ordem
 * 
 * Usa dbProvider para permitir injeção de dependência em testes
 */
export class MigrationManager {
  private static migrations: Migration[] = [];
  private static readonly MIGRATIONS_TABLE = 'migrations';

  /**
   * Registra uma migração no sistema
   * @param migration - Instância da migração a ser registrada
   */
  static register(migration: Migration): void {
    this.migrations.push(migration);
  }

  /**
   * Executa todas as migrações pendentes
   *
   * Cria a tabela de controle se não existir e executa
   * cada migração registrada que ainda não foi aplicada.
   * 
   * @param db - Instância opcional do banco (usa dbProvider se não fornecida)
   */
  static runAll(db?: Database): void {
    const database = db ?? dbProvider.getDb();
    
    console.log('🔄 Verificando migrações pendentes...');

    // Cria tabela de controle de migrações se não existir
    this.ensureMigrationsTableExists(database);

    if (this.migrations.length === 0) {
      console.log('ℹ️  Nenhuma migração registrada');
      return;
    }

    let appliedCount = 0;
    let skippedCount = 0;

    for (const migration of this.migrations) {
      if (this.isApplied(database, migration.name)) {
        console.log(`⏭️  [${migration.name}] Já aplicada - ${migration.description}`);
        skippedCount++;
        continue;
      }

      try {
        console.log(`🔧 [${migration.name}] Aplicando: ${migration.description}...`);
        migration.apply(database);
        this.markAsApplied(database, migration.name);
        console.log(`✅ [${migration.name}] Aplicada com sucesso!`);
        appliedCount++;
      } catch (error) {
        console.error(`❌ [${migration.name}] Erro ao aplicar migração:`, error);
        throw new Error(`Falha na migração "${migration.name}": ${error}`);
      }
    }

    console.log(
      `📊 Resumo: ${appliedCount} aplicada(s), ${skippedCount} pulada(s), ${this.migrations.length} total`
    );

    if (appliedCount > 0) {
      console.log('🎉 Migrações concluídas com sucesso!');
    }
  }

  /**
   * Cria a tabela de controle de migrações se não existir
   */
  private static ensureMigrationsTableExists(db: Database): void {
    db.run(`
      CREATE TABLE IF NOT EXISTS ${this.MIGRATIONS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Verifica se uma migração já foi aplicada
   * @param db - Instância do banco de dados
   * @param name - Nome da migração
   * @returns true se a migração já foi aplicada, false caso contrário
   */
  private static isApplied(db: Database, name: string): boolean {
    const stmt = db.prepare(
      `SELECT COUNT(*) as count FROM ${this.MIGRATIONS_TABLE} WHERE name = ?`
    );
    const result = stmt.get(name) as { count: number };
    return (result?.count ?? 0) > 0;
  }

  /**
   * Marca uma migração como aplicada
   * @param db - Instância do banco de dados
   * @param name - Nome da migração
   */
  private static markAsApplied(db: Database, name: string): void {
    const stmt = db.prepare(
      `INSERT INTO ${this.MIGRATIONS_TABLE} (name) VALUES (?)`
    );
    stmt.run(name);
  }

  /**
   * Retorna lista de todas as migrações registradas
   */
  static getRegisteredMigrations(): Migration[] {
    return [...this.migrations];
  }

  /**
   * Reseta o estado do manager (útil para testes)
   */
  static reset(): void {
    this.migrations = [];
  }
}
