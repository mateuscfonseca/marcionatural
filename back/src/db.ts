/**
 * Módulo db.ts - Wrapper para compatibilidade
 *
 * ATENÇÃO: Este arquivo existe apenas para compatibilidade com código legado.
 * Todo o código novo deve usar diretamente: import { getDb } from './db-provider';
 *
 * Para migrar código existente:
 * - Onde usa: import { db } from './db';
 * - Mude para: import { getDb } from './db-provider';
 *              const db = getDb();
 *
 * IMPORTANTE: Não exportamos mais `db` como constante para evitar
 * inicialização prematura do banco de dados antes de DATABASE_PATH ser definido.
 */

import { dbProvider, initDatabase as initDbProvider, getDb } from './db-provider';

// Exporta função getDb para lazy initialization
// Isso garante que o banco só seja criado quando realmente necessário,
// após as variáveis de ambiente estarem configuradas
export { getDb };

// Exporta função de inicialização
export function initDatabase(): void {
  initDbProvider();
}

// Re-exporta dbProvider para quem quiser usar diretamente
export { dbProvider } from './db-provider';
