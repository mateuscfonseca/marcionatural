import type { Migration } from './Migration';
import type { Database } from 'bun:sqlite';

/**
 * Migração 003: Corrige entradas com entry_date NULL
 *
 * Esta migração preenche o campo entry_date com base no created_at
 * para entradas antigas que foram criadas antes da validação obrigatória
 * do campo entry_date.
 */
export class FixNullEntryDateMigration implements Migration {
  readonly name = '003-fix-null-entry-date';
  readonly description = 'Corrige entradas com entry_date NULL usando created_at como referência';

  apply(db: Database): void {
    // Conta quantas entradas serão afetadas
    const countStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM user_entries
      WHERE entry_date IS NULL
    `);
    const result = countStmt.get() as { count: number };
    const count = result.count;

    if (count === 0) {
      console.log('  ℹ️  Nenhuma entrada com entry_date NULL encontrada');
      return;
    }

    console.log(`  ℹ️  Corrigindo ${count} entradas com entry_date NULL...`);

    // Atualiza entry_date com base no created_at (extraindo apenas a data)
    db.run(`
      UPDATE user_entries
      SET entry_date = DATE(created_at)
      WHERE entry_date IS NULL
    `);

    console.log(`  ✅ ${count} entradas corrigidas com entry_date = DATE(created_at)`);

    // Verifica se ainda há entradas com entry_date NULL
    const remainingStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM user_entries
      WHERE entry_date IS NULL
    `);
    const remaining = remainingStmt.get() as { count: number };

    if (remaining.count > 0) {
      console.error(`  ❌ Atenção: ${remaining.count} entradas ainda estão com entry_date NULL`);
    } else {
      console.log('  ✅ Todas as entradas agora possuem entry_date preenchido');
    }
  }
}
