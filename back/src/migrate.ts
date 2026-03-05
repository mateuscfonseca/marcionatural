#!/usr/bin/env bun
/**
 * Script de migração para atualizar o banco de dados
 * Adiciona novas colunas e tabela para o sistema de reports
 */

import { getDb, initDatabase } from './db-provider';

console.log('🚀 Iniciando migração do banco de dados...');

// Inicializa o banco (cria se não existir)
initDatabase();

// Obtém o banco de dados
const db = getDb();

try {
  // 1. Criar tabela entry_reports (se não existir)
  console.log('📋 Criando tabela entry_reports...');
  db.run(`
    CREATE TABLE IF NOT EXISTS entry_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL,
      reporter_user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (entry_id) REFERENCES user_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (reporter_user_id) REFERENCES users(id),
      UNIQUE (entry_id, reporter_user_id)
    )
  `);

  // 2. Adicionar colunas em user_entries (se não existirem)
  console.log('📝 Adicionando colunas em user_entries...');
  
  // photo_original_name
  try {
    db.run('ALTER TABLE user_entries ADD COLUMN photo_original_name TEXT');
    console.log('  ✅ photo_original_name adicionada');
  } catch (e) {
    console.log('  ℹ️  photo_original_name já existe');
  }

  // photo_identifier
  try {
    db.run('ALTER TABLE user_entries ADD COLUMN photo_identifier TEXT UNIQUE');
    console.log('  ✅ photo_identifier adicionada');
  } catch (e) {
    console.log('  ℹ️  photo_identifier já existe');
  }

  // is_invalidated
  try {
    db.run('ALTER TABLE user_entries ADD COLUMN is_invalidated BOOLEAN DEFAULT FALSE');
    console.log('  ✅ is_invalidated adicionada');
  } catch (e) {
    console.log('  ℹ️  is_invalidated já existe');
  }

  // invalidated_at
  try {
    db.run('ALTER TABLE user_entries ADD COLUMN invalidated_at DATETIME');
    console.log('  ✅ invalidated_at adicionada');
  } catch (e) {
    console.log('  ℹ️  invalidated_at já existe');
  }

  // 3. Criar índices para performance
  console.log('📊 Criando índices...');
  
  try {
    db.run('CREATE INDEX IF NOT EXISTS idx_entry_reports_entry ON entry_reports(entry_id)');
    console.log('  ✅ idx_entry_reports_entry criado');
  } catch (e) {
    console.log('  ℹ️  idx_entry_reports_entry já existe');
  }

  try {
    db.run('CREATE INDEX IF NOT EXISTS idx_entry_reports_reporter ON entry_reports(reporter_user_id)');
    console.log('  ✅ idx_entry_reports_reporter criado');
  } catch (e) {
    console.log('  ℹ️  idx_entry_reports_reporter já existe');
  }

  try {
    db.run('CREATE INDEX IF NOT EXISTS idx_user_entries_invalidated ON user_entries(is_invalidated)');
    console.log('  ✅ idx_user_entries_invalidated criado');
  } catch (e) {
    console.log('  ℹ️  idx_user_entries_invalidated já existe');
  }

  console.log('✅ Migração concluída com sucesso!');
} catch (error) {
  console.error('❌ Erro na migração:', error);
  process.exit(1);
}
