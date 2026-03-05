import type { Migration } from './Migration';
import type { Database } from 'bun:sqlite';

/**
 * Migração 001: Adiciona coluna entry_date na tabela user_entries
 *
 * Esta migração permite o registro retroativo de entradas,
 * adicionando uma coluna para armazenar a data de referência
 * da atividade (diferente de created_at que é o timestamp do registro).
 *
 * Também adiciona índices para performance em consultas por data.
 */
export class AddEntryDateMigration implements Migration {
  readonly name = '001-add-entry-date';
  readonly description = 'Adiciona coluna entry_date e índices na tabela user_entries';

  apply(db: Database): void {
    // Verifica se a coluna já existe
    const tableInfo = db.prepare("PRAGMA table_info(user_entries)").all() as Array<{ name: string }>;
    const hasEntryDate = tableInfo.some(col => col.name === 'entry_date');

    if (hasEntryDate) {
      console.log('  ℹ️  Coluna entry_date já existe');
    } else {
      // Adiciona a coluna entry_date
      db.run('ALTER TABLE user_entries ADD COLUMN entry_date DATE');
      console.log('  ✅ Coluna entry_date adicionada');
    }

    // Cria índices para performance (são idempotentes com IF NOT EXISTS)
    db.run('CREATE INDEX IF NOT EXISTS idx_user_entries_entry_date ON user_entries(entry_date)');
    console.log('  ✅ Índice idx_user_entries_entry_date verificado');

    db.run('CREATE INDEX IF NOT EXISTS idx_user_entries_user_date ON user_entries(user_id, entry_date)');
    console.log('  ✅ Índice idx_user_entries_user_date verificado');
  }
}
