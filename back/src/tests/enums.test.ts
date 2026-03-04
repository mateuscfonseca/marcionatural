import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { getTestDb, createTestDatabase, closeTestDatabase, resetTestData, SEED_IDS } from '../test-db';
import { CategoryId, CategoryNames, CategoryDailyCaps } from '../utils/category.enum';
import { ActivityTypeId, ActivityTypeNames } from '../utils/activity-type.enum';
import { getDb } from '../db';

describe('Enums', () => {
  let db: ReturnType<typeof getTestDb>;

  beforeAll(() => {
    createTestDatabase();
    db = getTestDb();
  });

  afterAll(() => {
    closeTestDatabase();
  });

  beforeEach(() => {
    resetTestData();
  });

  describe('CategoryId', () => {
    test('deve mapear IDs corretamente', () => {
      expect(CategoryId.REFEICAO).toBe(1);
      expect(CategoryId.EXERCICIO).toBe(2);
      expect(CategoryId.PROJETO_PESSOAL).toBe(3);
      expect(CategoryId.ENTORPECENTES).toBe(4);
    });

    test('deve ter nomes corretos para cada categoria', () => {
      expect(CategoryNames[CategoryId.REFEICAO]).toBe('Alimentação');
      expect(CategoryNames[CategoryId.EXERCICIO]).toBe('Exercício');
      expect(CategoryNames[CategoryId.PROJETO_PESSOAL]).toBe('Projeto Pessoal');
      expect(CategoryNames[CategoryId.ENTORPECENTES]).toBe('Entorpecentes');
    });

    test('deve ter tetos diários configurados', () => {
      expect(CategoryDailyCaps[CategoryId.REFEICAO]).toEqual({ max: 10, min: -10 });
      expect(CategoryDailyCaps[CategoryId.EXERCICIO]).toEqual({ max: 5, min: 0 });
      expect(CategoryDailyCaps[CategoryId.PROJETO_PESSOAL]).toEqual({ max: 50, min: 0 });
      expect(CategoryDailyCaps[CategoryId.ENTORPECENTES]).toEqual({ max: 0, min: -5 });
    });

    test('deve buscar categoria do banco usando enum', () => {
      const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(CategoryId.ENTORPECENTES) as { id: number; name: string };
      expect(category).toBeDefined();
      expect(category.id).toBe(CategoryId.ENTORPECENTES);
      expect(category.name).toBe('entorpecentes');
    });
  });

  describe('ActivityTypeId', () => {
    test('deve mapear IDs corretamente', () => {
      expect(ActivityTypeId.ALIMENTACAO_LIMPA).toBe(1);
      expect(ActivityTypeId.ALIMENTACAO_SUJA).toBe(2);
      expect(ActivityTypeId.EXERCICIO_FISICO).toBe(3);
      expect(ActivityTypeId.USAR_TABACO).toBe(4);
    });

    test('deve ter nomes corretos para cada activity type', () => {
      expect(ActivityTypeNames[ActivityTypeId.ALIMENTACAO_LIMPA]).toBe('Alimentação Limpa');
      expect(ActivityTypeNames[ActivityTypeId.ALIMENTACAO_SUJA]).toBe('Alimentação Suja');
      expect(ActivityTypeNames[ActivityTypeId.EXERCICIO_FISICO]).toBe('Exercício Físico');
      expect(ActivityTypeNames[ActivityTypeId.USAR_TABACO]).toBe('Usar Tabaco');
    });

    test('deve buscar activity type do banco usando enum', () => {
      const activityType = db.prepare('SELECT * FROM activity_types WHERE id = ?').get(ActivityTypeId.USAR_TABACO) as {
        id: number;
        name: string;
        category_id: number;
        base_points: number;
        is_positive: number;
      };
      expect(activityType).toBeDefined();
      expect(activityType.id).toBe(ActivityTypeId.USAR_TABACO);
      expect(activityType.name).toBe('Usar Tabaco');
      expect(activityType.category_id).toBe(CategoryId.ENTORPECENTES);
      expect(activityType.base_points).toBe(-5);
      expect(activityType.is_positive).toBe(0); // SQLite retorna 0/1 para booleanos
    });

    test('deve buscar todos os activity types de uma categoria usando enum', () => {
      const activityTypes = db.prepare(
        'SELECT * FROM activity_types WHERE category_id = ?'
      ).all(CategoryId.ENTORPECENTES) as Array<{ id: number; name: string }>;
      
      expect(activityTypes.length).toBeGreaterThan(0);
      expect(activityTypes.some(at => at.id === ActivityTypeId.USAR_TABACO)).toBe(true);
    });
  });

  describe('Integração Enums com Banco', () => {
    test('deve encontrar todas as categorias definidas nos enums', () => {
      const enumCategories = Object.values(CategoryId);
      
      for (const categoryId of enumCategories) {
        const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId) as { id: number } | undefined;
        expect(category).toBeDefined();
        expect(category?.id).toBe(categoryId);
      }
    });

    test('deve encontrar todos os activity types definidos nos enums', () => {
      const enumActivityTypes = Object.values(ActivityTypeId);
      
      for (const activityTypeId of enumActivityTypes) {
        const activityType = db.prepare('SELECT * FROM activity_types WHERE id = ?').get(activityTypeId) as { id: number } | undefined;
        expect(activityType).toBeDefined();
        expect(activityType?.id).toBe(activityTypeId);
      }
    });
  });
});
