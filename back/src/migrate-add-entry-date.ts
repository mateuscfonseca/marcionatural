/**
 * Migração: Adiciona coluna entry_date na tabela user_entries
 * Esta migração é idempotente (pode ser executada múltiplas vezes)
 */

import { db } from './db';

console.log('🔄 Iniciando migração: Adicionar coluna entry_date...');

try {
  // Verifica se a coluna já existe
  const tableInfo = db.prepare("PRAGMA table_info(user_entries)").all() as Array<{ name: string }>;
  const hasEntryDate = tableInfo.some(col => col.name === 'entry_date');

  if (hasEntryDate) {
    console.log('✅ Coluna entry_date já existe. Migração não necessária.');
  } else {
    // Adiciona a coluna entry_date
    db.run('ALTER TABLE user_entries ADD COLUMN entry_date DATE');
    console.log('✅ Coluna entry_date adicionada com sucesso.');

    // Cria índices para performance
    db.run('CREATE INDEX IF NOT EXISTS idx_user_entries_entry_date ON user_entries(entry_date)');
    db.run('CREATE INDEX IF NOT EXISTS idx_user_entries_user_date ON user_entries(user_id, entry_date)');
    console.log('✅ Índices criados com sucesso.');
  }

  console.log('🎉 Migração concluída!');
} catch (error) {
  console.error('❌ Erro na migração:', error);
  process.exit(1);
}
