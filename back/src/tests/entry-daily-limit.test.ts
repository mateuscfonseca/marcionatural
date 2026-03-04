import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { getTestDb, createTestDatabase, closeTestDatabase, resetTestData, SEED_IDS } from '../test-db';
import { hasUserEntryForCategoryDate, createEntry, getUserEntryForDate } from '../services/entry.service';
import { CategoryId } from '../utils/category.enum';

describe('Entry Daily Limit', () => {
  const testUserId = 101;
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
    // Cria usuário de teste
    db.run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)',
      [testUserId, 'testuser_daily', 'hash123']);
  });

  describe('hasUserEntryForCategoryDate', () => {
    test('deve retornar false quando não há entrada para categoria/data', async () => {
      const hasEntry = await hasUserEntryForCategoryDate(testUserId, '2024-01-15', CategoryId.EXERCICIO);
      expect(hasEntry).toBe(false);
    });

    test('deve retornar true quando há entrada de exercício para a data', async () => {
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Treino', '2024-01-15']);

      const hasEntry = await hasUserEntryForCategoryDate(testUserId, '2024-01-15', CategoryId.EXERCICIO);
      expect(hasEntry).toBe(true);
    });

    test('deve retornar true quando há entrada de alimentação para a data', async () => {
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.alimentacaoLimpa, 'Almoço', '2024-01-15']);

      const hasEntry = await hasUserEntryForCategoryDate(testUserId, '2024-01-15', CategoryId.REFEICAO);
      expect(hasEntry).toBe(true);
    });

    test('deve retornar true quando há entrada de entorpecentes para a data', async () => {
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.usarTabaco, 'Cigarro', '2024-01-15']);

      const hasEntry = await hasUserEntryForCategoryDate(testUserId, '2024-01-15', CategoryId.ENTORPECENTES);
      expect(hasEntry).toBe(true);
    });

    test('deve diferenciar categorias diferentes na mesma data', async () => {
      // Cria entrada de exercício
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Treino', '2024-01-15']);

      // Exercício deve ter entrada
      const hasExercise = await hasUserEntryForCategoryDate(testUserId, '2024-01-15', CategoryId.EXERCICIO);
      expect(hasExercise).toBe(true);

      // Alimentação NÃO deve ter entrada (categoria diferente)
      const hasFood = await hasUserEntryForCategoryDate(testUserId, '2024-01-15', CategoryId.REFEICAO);
      expect(hasFood).toBe(false);

      // Entorpecentes NÃO deve ter entrada (categoria diferente)
      const hasDrugs = await hasUserEntryForCategoryDate(testUserId, '2024-01-15', CategoryId.ENTORPECENTES);
      expect(hasDrugs).toBe(false);
    });

    test('deve diferenciar datas diferentes na mesma categoria', async () => {
      // Cria entrada de exercício dia 15
      db.run(`
        INSERT INTO user_entries (user_id, activity_type_id, description, entry_date)
        VALUES (?, ?, ?, ?)
      `, [testUserId, SEED_IDS.activityTypes.exercicioFisico, 'Treino dia 15', '2024-01-15']);

      // Dia 15 deve ter entrada
      const hasEntry15 = await hasUserEntryForCategoryDate(testUserId, '2024-01-15', CategoryId.EXERCICIO);
      expect(hasEntry15).toBe(true);

      // Dia 16 NÃO deve ter entrada
      const hasEntry16 = await hasUserEntryForCategoryDate(testUserId, '2024-01-16', CategoryId.EXERCICIO);
      expect(hasEntry16).toBe(false);
    });
  });

  describe('Regra de 1 entrada por categoria por dia', () => {
    test('deve permitir entradas de categorias diferentes no mesmo dia', async () => {
      // Cria entrada de exercício
      await createEntry({
        userId: testUserId,
        activityTypeId: SEED_IDS.activityTypes.exercicioFisico,
        description: 'Treino',
        entryDate: '2024-01-15',
      });

      // Cria entrada de alimentação (deve permitir, categoria diferente)
      const foodEntry = await createEntry({
        userId: testUserId,
        activityTypeId: SEED_IDS.activityTypes.alimentacaoLimpa,
        description: 'Almoço',
        entryDate: '2024-01-15',
      });

      expect(foodEntry).toBeDefined();
      expect(foodEntry.category_id).toBe(CategoryId.REFEICAO);
    });

    test('deve permitir apenas 1 entrada de exercício por dia', async () => {
      // Primeira entrada de exercício (deve permitir)
      const entry1 = await createEntry({
        userId: testUserId,
        activityTypeId: SEED_IDS.activityTypes.exercicioFisico,
        description: 'Treino manhã',
        entryDate: '2024-01-15',
      });

      expect(entry1).toBeDefined();

      // Segunda entrada de exercício no mesmo dia (a validação é feita na route, não no service)
      // Aqui testamos que hasUserEntryForCategoryDate retorna true
      const hasEntry = await hasUserEntryForCategoryDate(testUserId, '2024-01-15', CategoryId.EXERCICIO);
      expect(hasEntry).toBe(true);
    });

    test('deve permitir entradas de exercício em dias diferentes', async () => {
      // Exercício dia 15
      const entry1 = await createEntry({
        userId: testUserId,
        activityTypeId: SEED_IDS.activityTypes.exercicioFisico,
        description: 'Treino dia 15',
        entryDate: '2024-01-15',
      });

      // Exercício dia 16 (deve permitir, dia diferente)
      const entry2 = await createEntry({
        userId: testUserId,
        activityTypeId: SEED_IDS.activityTypes.exercicioFisico,
        description: 'Treino dia 16',
        entryDate: '2024-01-16',
      });

      expect(entry1).toBeDefined();
      expect(entry2).toBeDefined();
    });

    test('deve permitir apenas 1 entrada de entorpecentes por dia', async () => {
      // Primeira entrada de entorpecentes
      const entry1 = await createEntry({
        userId: testUserId,
        activityTypeId: SEED_IDS.activityTypes.usarTabaco,
        description: 'Cigarro 1',
        entryDate: '2024-01-15',
      });

      expect(entry1).toBeDefined();

      // Verifica que já existe entrada
      const hasEntry = await hasUserEntryForCategoryDate(testUserId, '2024-01-15', CategoryId.ENTORPECENTES);
      expect(hasEntry).toBe(true);
    });
  });
});
