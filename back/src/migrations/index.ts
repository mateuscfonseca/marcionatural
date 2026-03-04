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
import { FixNullEntryDateMigration } from './003-fix-null-entry-date';
import { AddEntorpecentesCategoryMigration } from './004-add-entorpecentes-category';
import { DropPointsColumnMigration } from './005-drop-points-column';

// Registrar todas as migrações em ordem
// Novas migrações devem ser adicionadas aqui
MigrationManager.register(new AddEntryDateMigration());
MigrationManager.register(new AddUserDeletedAtMigration());
MigrationManager.register(new FixNullEntryDateMigration());
MigrationManager.register(new AddEntorpecentesCategoryMigration());
MigrationManager.register(new DropPointsColumnMigration());
// Exemplo para futuras migrações:
// MigrationManager.register(new NewMigration());

export { MigrationManager };
export type { Migration } from './Migration';
