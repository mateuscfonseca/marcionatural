import type { Migration } from './Migration';
import type { Database } from 'bun:sqlite';

/**
 * Migração 002: Adiciona coluna deleted_at na tabela users
 *
 * Esta migração implementa exclusão lógica de usuários,
 * permitindo que usuários sejam "excluídos" sem perder seus dados.
 * Usuários com deleted_at != NULL são considerados excluídos.
 */
export class AddUserDeletedAtMigration implements Migration {
  readonly name = '002-add-user-deleted-at';
  readonly description = 'Adiciona coluna deleted_at para exclusão lógica na tabela users';

  apply(db: Database): void {
    // Verifica se a coluna já existe
    const tableInfo = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    const hasDeletedAt = tableInfo.some(col => col.name === 'deleted_at');

    if (hasDeletedAt) {
      console.log('  ℹ️  Coluna deleted_at já existe');
    } else {
      // Adiciona a coluna deleted_at
      db.run('ALTER TABLE users ADD COLUMN deleted_at DATETIME');
      console.log('  ✅ Coluna deleted_at adicionada');
    }

    // Cria índice para performance em consultas que filtram por deleted_at
    db.run('CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at)');
    console.log('  ✅ Índice idx_users_deleted_at verificado');
  }
}
