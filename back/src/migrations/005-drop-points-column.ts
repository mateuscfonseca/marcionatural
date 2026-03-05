import type { Migration } from './Migration';
import type { Database } from 'bun:sqlite';

/**
 * Migração 005: Remove coluna points de user_entries
 *
 * Esta migração remove a coluna points da tabela user_entries,
 * pois os pontos são agora calculados dinamicamente baseado no
 * activity_type e nos tetos diários por categoria.
 *
 * A coluna points estava desatualizada e causava inconsistências
 * entre o valor armazenado e o cálculo real dos pontos.
 *
 * Nota: SQLite suporta DROP COLUMN apenas na versão 3.35.0+ (2021-03-12)
 */
export class DropPointsColumnMigration implements Migration {
  readonly name = '005-drop-points-column';
  readonly description = 'Remove coluna points desatualizada de user_entries';

  apply(db: Database): void {
    // Verifica se a coluna existe
    const tableInfo = db.prepare("PRAGMA table_info(user_entries)").all() as Array<{ name: string }>;
    const hasPoints = tableInfo.some(col => col.name === 'points');

    if (!hasPoints) {
      console.log('  ℹ️  Coluna points já foi removida');
      return;
    }

    // Verifica versão do SQLite para DROP COLUMN
    const versionStmt = db.prepare("SELECT sqlite_version() as version").get() as { version: string };
    const [major, minor, patch] = versionStmt.version.split('.').map(Number);

    // DROP COLUMN suportado apenas em SQLite 3.35.0+
    const supportsDropColumn = major > 3 || (major === 3 && minor >= 35);

    if (!supportsDropColumn) {
      console.log('  ⚠️  SQLite versão', versionStmt.version, 'não suporta DROP COLUMN');
      console.log('  ℹ️  Coluna points será ignorada nas consultas (não causa problemas)');
      return;
    }

    try {
      // Remove a coluna points
      db.run('ALTER TABLE user_entries DROP COLUMN points');
      console.log('  ✅ Coluna points removida com sucesso');
    } catch (error) {
      console.error('  ❌ Erro ao remover coluna points:', error);
      console.log('  ℹ️  Coluna points será ignorada nas consultas (não causa problemas)');
    }
  }
}
