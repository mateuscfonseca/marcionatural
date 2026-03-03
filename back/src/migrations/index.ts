/**
 * Módulo de migrações do banco de dados
 *
 * Para adicionar uma nova migração:
 * 1. Crie um arquivo em migrations/NNN-descricao.ts
 * 2. Implemente a interface Migration
 * 3. Registre a migração abaixo com MigrationManager.register()
 * 4. As migrações são executadas em ordem de registro
 */

import { MigrationManager } from './MigrationManager';
import { AddEntryDateMigration } from './001-add-entry-date';
import { AddUserDeletedAtMigration } from './002-add-user-deleted-at';

// Registrar todas as migrações em ordem
// Novas migrações devem ser adicionadas aqui
MigrationManager.register(new AddEntryDateMigration());
MigrationManager.register(new AddUserDeletedAtMigration());
// Exemplo para futuras migrações:
// MigrationManager.register(new NewMigration());

export { MigrationManager };
export type { Migration } from './Migration';
