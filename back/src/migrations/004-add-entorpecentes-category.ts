import type { Migration } from './Migration';
import { db } from '../db';

/**
 * Migração 004: Adiciona categoria entorpecentes e atividade Usar Tabaco
 *
 * Esta migração adiciona:
 * - Nova categoria "entorpecentes" (id=4)
 * - Nova atividade "Usar Tabaco" (id=4, categoria=4, -5 pontos)
 *
 * A categoria entorpecentes é sempre negativa, com teto de -5 pontos por dia.
 */
export class AddEntorpecentesCategoryMigration implements Migration {
  readonly name = '004-add-entorpecentes-category';
  readonly description = 'Adiciona categoria entorpecentes e atividade Usar Tabaco';

  apply(): void {
    // Verifica se a categoria já existe
    const categoryStmt = db.prepare("SELECT COUNT(*) as count FROM categories WHERE id = 4");
    const categoryResult = categoryStmt.get() as { count: number };
    
    if (categoryResult.count === 0) {
      db.run(`
        INSERT INTO categories (id, name, description)
        VALUES (4, 'entorpecentes', 'Uso de substâncias entorpecentes')
      `);
      console.log('  ✅ Categoria entorpecentes adicionada');
    } else {
      console.log('  ℹ️  Categoria entorpecentes já existe');
    }

    // Verifica se a atividade já existe
    const activityStmt = db.prepare("SELECT COUNT(*) as count FROM activity_types WHERE id = 4");
    const activityResult = activityStmt.get() as { count: number };
    
    if (activityResult.count === 0) {
      db.run(`
        INSERT INTO activity_types (id, name, category_id, is_positive, base_points, is_validated)
        VALUES (4, 'Usar Tabaco', 4, FALSE, -5, TRUE)
      `);
      console.log('  ✅ Atividade Usar Tabaco adicionada');
    } else {
      console.log('  ℹ️  Atividade Usar Tabaco já existe');
    }
  }
}
